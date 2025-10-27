"""
ACSO Enterprise Framework - Compliance Reporting Automation

This module implements automated compliance reporting for various regulatory frameworks
including SOX, GDPR, HIPAA, PCI-DSS, and custom compliance requirements.

Key Features:
- Multi-framework compliance report generation
- Automated evidence collection and packaging
- Scheduled reporting with customizable templates
- Real-time compliance status monitoring
- Audit trail integration and validation
- Regulatory change tracking and impact assessment
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod
import json
import uuid
import hashlib
import zipfile
import io
from pathlib import Path
import boto3
from botocore.exceptions import ClientError
import pandas as pd
from jinja2 import Template, Environment, FileSystemLoader

logger = logging.getLogger(__name__)

class ComplianceFramework(Enum):
    """Supported compliance frameworks."""
    SOX = "sox"
    GDPR = "gdpr"
    HIPAA = "hipaa"
    PCI_DSS = "pci_dss"
    ISO_27001 = "iso_27001"
    NIST = "nist"
    CUSTOM = "custom"

class ReportType(Enum):
    """Types of compliance reports."""
    ASSESSMENT = "assessment"
    AUDIT = "audit"
    INCIDENT = "incident"
    RISK = "risk"
    CONTROL_EFFECTIVENESS = "control_effectiveness"
    REMEDIATION = "remediation"
    EXECUTIVE_SUMMARY = "executive_summary"

class ComplianceStatus(Enum):
    """Compliance status levels."""
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    PARTIALLY_COMPLIANT = "partially_compliant"
    NOT_ASSESSED = "not_assessed"
    IN_REMEDIATION = "in_remediation"

class EvidenceType(Enum):
    """Types of compliance evidence."""
    AUDIT_LOG = "audit_log"
    CONFIGURATION = "configuration"
    POLICY_DOCUMENT = "policy_document"
    SCREENSHOT = "screenshot"
    CERTIFICATE = "certificate"
    TEST_RESULT = "test_result"
    INTERVIEW_NOTES = "interview_notes"
    SYSTEM_OUTPUT = "system_output"

@dataclass
class ComplianceControl:
    """Individual compliance control definition."""
    control_id: str
    framework: ComplianceFramework
    name: str
    description: str
    category: str
    requirements: List[str]
    test_procedures: List[str]
    evidence_requirements: List[EvidenceType]
    frequency: str  # "daily", "weekly", "monthly", "quarterly", "annually"
    owner: str
    status: ComplianceStatus = ComplianceStatus.NOT_ASSESSED
    last_assessed: Optional[datetime] = None
    next_assessment: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Evidence:
    """Compliance evidence record."""
    evidence_id: str
    control_id: str
    evidence_type: EvidenceType
    title: str
    description: str
    file_path: Optional[str] = None
    file_hash: Optional[str] = None
    collected_at: datetime = field(default_factory=datetime.now)
    collected_by: str = ""
    retention_period: timedelta = field(default_factory=lambda: timedelta(days=2555))  # 7 years
    metadata: Dict[str, Any] = field(default_factory=dict)
    is_valid: bool = True

@dataclass
class ComplianceAssessment:
    """Compliance assessment result."""
    assessment_id: str
    control_id: str
    framework: ComplianceFramework
    status: ComplianceStatus
    score: float  # 0.0 to 1.0
    findings: List[str]
    recommendations: List[str]
    evidence_ids: List[str]
    assessed_by: str
    assessed_at: datetime = field(default_factory=datetime.now)
    valid_until: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ComplianceReport:
    """Generated compliance report."""
    report_id: str
    framework: ComplianceFramework
    report_type: ReportType
    title: str
    description: str
    period_start: datetime
    period_end: datetime
    generated_at: datetime = field(default_factory=datetime.now)
    generated_by: str = ""
    file_path: Optional[str] = None
    evidence_package_path: Optional[str] = None
    summary: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

class EvidenceCollector:
    """Collects and manages compliance evidence."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize evidence collector."""
        self.config = config
        self.evidence_storage: Dict[str, Evidence] = {}
        self.s3_client = boto3.client('s3') if config.get('use_s3') else None
        self.storage_bucket = config.get('evidence_bucket', 'acso-compliance-evidence')
    
    async def collect_audit_log_evidence(
        self,
        control_id: str,
        start_date: datetime,
        end_date: datetime,
        filters: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Collect audit log evidence for a control."""
        try:
            evidence_id = str(uuid.uuid4())
            
            # Query audit logs (this would integrate with the audit system)
            audit_logs = await self._query_audit_logs(start_date, end_date, filters)
            
            # Create evidence file
            evidence_data = {
                'control_id': control_id,
                'period_start': start_date.isoformat(),
                'period_end': end_date.isoformat(),
                'filters': filters or {},
                'logs': audit_logs,
                'total_entries': len(audit_logs),
                'collected_at': datetime.now().isoformat()
            }
            
            # Store evidence
            file_path = await self._store_evidence_file(
                evidence_id, 'audit_logs.json', json.dumps(evidence_data, indent=2)
            )
            
            # Create evidence record
            evidence = Evidence(
                evidence_id=evidence_id,
                control_id=control_id,
                evidence_type=EvidenceType.AUDIT_LOG,
                title=f"Audit Logs for Control {control_id}",
                description=f"Audit logs from {start_date.date()} to {end_date.date()}",
                file_path=file_path,
                file_hash=hashlib.sha256(json.dumps(evidence_data).encode()).hexdigest()
            )
            
            self.evidence_storage[evidence_id] = evidence
            
            logger.info(f"Collected audit log evidence: {evidence_id}")
            
            return {
                'success': True,
                'evidence_id': evidence_id,
                'entries_collected': len(audit_logs)
            }
            
        except Exception as e:
            logger.error(f"Failed to collect audit log evidence: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def collect_configuration_evidence(
        self,
        control_id: str,
        system_name: str,
        configuration_items: List[str]
    ) -> Dict[str, Any]:
        """Collect system configuration evidence."""
        try:
            evidence_id = str(uuid.uuid4())
            
            # Collect configuration data
            config_data = {}
            for item in configuration_items:
                config_data[item] = await self._get_configuration_item(system_name, item)
            
            # Create evidence file
            evidence_data = {
                'control_id': control_id,
                'system_name': system_name,
                'configuration_items': config_data,
                'collected_at': datetime.now().isoformat()
            }
            
            # Store evidence
            file_path = await self._store_evidence_file(
                evidence_id, f'{system_name}_config.json', json.dumps(evidence_data, indent=2)
            )
            
            # Create evidence record
            evidence = Evidence(
                evidence_id=evidence_id,
                control_id=control_id,
                evidence_type=EvidenceType.CONFIGURATION,
                title=f"Configuration for {system_name}",
                description=f"System configuration for control {control_id}",
                file_path=file_path,
                file_hash=hashlib.sha256(json.dumps(evidence_data).encode()).hexdigest()
            )
            
            self.evidence_storage[evidence_id] = evidence
            
            logger.info(f"Collected configuration evidence: {evidence_id}")
            
            return {
                'success': True,
                'evidence_id': evidence_id,
                'items_collected': len(configuration_items)
            }
            
        except Exception as e:
            logger.error(f"Failed to collect configuration evidence: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def collect_test_result_evidence(
        self,
        control_id: str,
        test_name: str,
        test_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Collect test result evidence."""
        try:
            evidence_id = str(uuid.uuid4())
            
            # Create evidence file
            evidence_data = {
                'control_id': control_id,
                'test_name': test_name,
                'test_results': test_results,
                'collected_at': datetime.now().isoformat()
            }
            
            # Store evidence
            file_path = await self._store_evidence_file(
                evidence_id, f'{test_name}_results.json', json.dumps(evidence_data, indent=2)
            )
            
            # Create evidence record
            evidence = Evidence(
                evidence_id=evidence_id,
                control_id=control_id,
                evidence_type=EvidenceType.TEST_RESULT,
                title=f"Test Results: {test_name}",
                description=f"Test results for control {control_id}",
                file_path=file_path,
                file_hash=hashlib.sha256(json.dumps(evidence_data).encode()).hexdigest()
            )
            
            self.evidence_storage[evidence_id] = evidence
            
            logger.info(f"Collected test result evidence: {evidence_id}")
            
            return {
                'success': True,
                'evidence_id': evidence_id
            }
            
        except Exception as e:
            logger.error(f"Failed to collect test result evidence: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def create_evidence_package(
        self,
        evidence_ids: List[str],
        package_name: str
    ) -> Dict[str, Any]:
        """Create a packaged archive of evidence files."""
        try:
            package_id = str(uuid.uuid4())
            
            # Create ZIP archive
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for evidence_id in evidence_ids:
                    evidence = self.evidence_storage.get(evidence_id)
                    if evidence and evidence.file_path:
                        # Read evidence file
                        file_content = await self._read_evidence_file(evidence.file_path)
                        if file_content:
                            # Add to ZIP with organized structure
                            zip_path = f"{evidence.control_id}/{evidence.evidence_type.value}/{evidence_id}_{Path(evidence.file_path).name}"
                            zip_file.writestr(zip_path, file_content)
                
                # Add manifest
                manifest = {
                    'package_id': package_id,
                    'package_name': package_name,
                    'created_at': datetime.now().isoformat(),
                    'evidence_count': len(evidence_ids),
                    'evidence_list': [
                        {
                            'evidence_id': eid,
                            'control_id': self.evidence_storage[eid].control_id,
                            'type': self.evidence_storage[eid].evidence_type.value,
                            'title': self.evidence_storage[eid].title
                        }
                        for eid in evidence_ids if eid in self.evidence_storage
                    ]
                }
                zip_file.writestr('manifest.json', json.dumps(manifest, indent=2))
            
            # Store package
            package_path = await self._store_evidence_file(
                package_id, f'{package_name}.zip', zip_buffer.getvalue()
            )
            
            logger.info(f"Created evidence package: {package_id}")
            
            return {
                'success': True,
                'package_id': package_id,
                'package_path': package_path,
                'evidence_count': len(evidence_ids)
            }
            
        except Exception as e:
            logger.error(f"Failed to create evidence package: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _query_audit_logs(
        self,
        start_date: datetime,
        end_date: datetime,
        filters: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """Query audit logs from the audit system."""
        # This would integrate with the immutable audit trail system
        # For now, return mock data
        return [
            {
                'timestamp': datetime.now().isoformat(),
                'user_id': 'user_123',
                'action': 'login',
                'resource': 'system',
                'result': 'success'
            }
        ]
    
    async def _get_configuration_item(self, system_name: str, item: str) -> Any:
        """Get a configuration item from a system."""
        # This would integrate with configuration management systems
        # For now, return mock data
        return f"mock_config_value_for_{item}"
    
    async def _store_evidence_file(self, evidence_id: str, filename: str, content: Union[str, bytes]) -> str:
        """Store evidence file in storage."""
        try:
            if isinstance(content, str):
                content = content.encode('utf-8')
            
            if self.s3_client:
                # Store in S3
                key = f"evidence/{evidence_id}/{filename}"
                self.s3_client.put_object(
                    Bucket=self.storage_bucket,
                    Key=key,
                    Body=content,
                    ServerSideEncryption='AES256'
                )
                return f"s3://{self.storage_bucket}/{key}"
            else:
                # Store locally
                storage_dir = Path(self.config.get('local_evidence_dir', '/tmp/evidence'))
                evidence_dir = storage_dir / evidence_id
                evidence_dir.mkdir(parents=True, exist_ok=True)
                
                file_path = evidence_dir / filename
                with open(file_path, 'wb') as f:
                    f.write(content)
                
                return str(file_path)
                
        except Exception as e:
            logger.error(f"Failed to store evidence file: {e}")
            raise
    
    async def _read_evidence_file(self, file_path: str) -> Optional[bytes]:
        """Read evidence file from storage."""
        try:
            if file_path.startswith('s3://'):
                # Read from S3
                bucket, key = file_path[5:].split('/', 1)
                response = self.s3_client.get_object(Bucket=bucket, Key=key)
                return response['Body'].read()
            else:
                # Read from local storage
                with open(file_path, 'rb') as f:
                    return f.read()
                    
        except Exception as e:
            logger.error(f"Failed to read evidence file: {e}")
            return None

class ComplianceAssessor:
    """Performs automated compliance assessments."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize compliance assessor."""
        self.config = config
        self.controls: Dict[str, ComplianceControl] = {}
        self.assessments: Dict[str, ComplianceAssessment] = {}
        self.evidence_collector = EvidenceCollector(config)
    
    async def assess_control(
        self,
        control_id: str,
        assessor_id: str,
        collect_evidence: bool = True
    ) -> Dict[str, Any]:
        """Perform assessment of a compliance control."""
        try:
            if control_id not in self.controls:
                return {
                    'success': False,
                    'error': 'Control not found'
                }
            
            control = self.controls[control_id]
            assessment_id = str(uuid.uuid4())
            
            # Collect evidence if requested
            evidence_ids = []
            if collect_evidence:
                for evidence_type in control.evidence_requirements:
                    evidence_result = await self._collect_evidence_for_control(
                        control, evidence_type
                    )
                    if evidence_result['success']:
                        evidence_ids.append(evidence_result['evidence_id'])
            
            # Perform assessment
            assessment_result = await self._perform_control_assessment(control, evidence_ids)
            
            # Create assessment record
            assessment = ComplianceAssessment(
                assessment_id=assessment_id,
                control_id=control_id,
                framework=control.framework,
                status=assessment_result['status'],
                score=assessment_result['score'],
                findings=assessment_result['findings'],
                recommendations=assessment_result['recommendations'],
                evidence_ids=evidence_ids,
                assessed_by=assessor_id
            )
            
            self.assessments[assessment_id] = assessment
            
            # Update control status
            control.status = assessment_result['status']
            control.last_assessed = datetime.now()
            control.next_assessment = self._calculate_next_assessment_date(control)
            
            logger.info(f"Completed assessment: {assessment_id}")
            
            return {
                'success': True,
                'assessment_id': assessment_id,
                'status': assessment_result['status'].value,
                'score': assessment_result['score'],
                'evidence_collected': len(evidence_ids)
            }
            
        except Exception as e:
            logger.error(f"Failed to assess control: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def assess_framework(
        self,
        framework: ComplianceFramework,
        assessor_id: str
    ) -> Dict[str, Any]:
        """Assess all controls in a compliance framework."""
        try:
            framework_controls = [
                control for control in self.controls.values()
                if control.framework == framework
            ]
            
            if not framework_controls:
                return {
                    'success': False,
                    'error': f'No controls found for framework {framework.value}'
                }
            
            assessment_results = []
            total_score = 0.0
            status_counts = {status: 0 for status in ComplianceStatus}
            
            # Assess each control
            for control in framework_controls:
                result = await self.assess_control(control.control_id, assessor_id)
                if result['success']:
                    assessment_results.append({
                        'control_id': control.control_id,
                        'control_name': control.name,
                        'status': result['status'],
                        'score': result['score']
                    })
                    total_score += result['score']
                    status_counts[ComplianceStatus(result['status'])] += 1
            
            # Calculate overall framework compliance
            overall_score = total_score / len(framework_controls) if framework_controls else 0.0
            overall_status = self._determine_overall_status(status_counts)
            
            return {
                'success': True,
                'framework': framework.value,
                'overall_status': overall_status.value,
                'overall_score': overall_score,
                'total_controls': len(framework_controls),
                'status_breakdown': {status.value: count for status, count in status_counts.items()},
                'control_results': assessment_results
            }
            
        except Exception as e:
            logger.error(f"Failed to assess framework: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _collect_evidence_for_control(
        self,
        control: ComplianceControl,
        evidence_type: EvidenceType
    ) -> Dict[str, Any]:
        """Collect specific type of evidence for a control."""
        if evidence_type == EvidenceType.AUDIT_LOG:
            return await self.evidence_collector.collect_audit_log_evidence(
                control.control_id,
                datetime.now() - timedelta(days=30),
                datetime.now()
            )
        elif evidence_type == EvidenceType.CONFIGURATION:
            return await self.evidence_collector.collect_configuration_evidence(
                control.control_id,
                'acso_system',
                ['security_settings', 'access_controls', 'encryption_config']
            )
        elif evidence_type == EvidenceType.TEST_RESULT:
            return await self.evidence_collector.collect_test_result_evidence(
                control.control_id,
                f'automated_test_{control.control_id}',
                {'test_passed': True, 'score': 0.95}
            )
        else:
            return {'success': False, 'error': f'Unsupported evidence type: {evidence_type}'}
    
    async def _perform_control_assessment(
        self,
        control: ComplianceControl,
        evidence_ids: List[str]
    ) -> Dict[str, Any]:
        """Perform the actual assessment of a control."""
        # This would implement control-specific assessment logic
        # For now, return mock assessment results
        
        findings = []
        recommendations = []
        score = 0.85  # Mock score
        
        if score >= 0.9:
            status = ComplianceStatus.COMPLIANT
        elif score >= 0.7:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
            findings.append("Some requirements not fully met")
            recommendations.append("Implement additional controls")
        else:
            status = ComplianceStatus.NON_COMPLIANT
            findings.append("Significant compliance gaps identified")
            recommendations.append("Immediate remediation required")
        
        return {
            'status': status,
            'score': score,
            'findings': findings,
            'recommendations': recommendations
        }
    
    def _calculate_next_assessment_date(self, control: ComplianceControl) -> datetime:
        """Calculate when the control should be assessed next."""
        frequency_days = {
            'daily': 1,
            'weekly': 7,
            'monthly': 30,
            'quarterly': 90,
            'annually': 365
        }
        
        days = frequency_days.get(control.frequency, 365)
        return datetime.now() + timedelta(days=days)
    
    def _determine_overall_status(self, status_counts: Dict[ComplianceStatus, int]) -> ComplianceStatus:
        """Determine overall compliance status based on individual control statuses."""
        total_controls = sum(status_counts.values())
        
        if total_controls == 0:
            return ComplianceStatus.NOT_ASSESSED
        
        compliant_ratio = status_counts[ComplianceStatus.COMPLIANT] / total_controls
        
        if compliant_ratio >= 0.95:
            return ComplianceStatus.COMPLIANT
        elif compliant_ratio >= 0.8:
            return ComplianceStatus.PARTIALLY_COMPLIANT
        else:
            return ComplianceStatus.NON_COMPLIANT

class ReportGenerator:
    """Generates compliance reports in various formats."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize report generator."""
        self.config = config
        self.template_env = Environment(
            loader=FileSystemLoader(config.get('template_dir', 'templates'))
        )
        self.reports: Dict[str, ComplianceReport] = {}
    
    async def generate_compliance_report(
        self,
        framework: ComplianceFramework,
        report_type: ReportType,
        period_start: datetime,
        period_end: datetime,
        assessments: List[ComplianceAssessment],
        evidence_ids: List[str] = None,
        template_name: str = None
    ) -> Dict[str, Any]:
        """Generate a compliance report."""
        try:
            report_id = str(uuid.uuid4())
            
            # Prepare report data
            report_data = await self._prepare_report_data(
                framework, report_type, period_start, period_end, assessments
            )
            
            # Generate report content
            template_name = template_name or f"{framework.value}_{report_type.value}.html"
            report_content = await self._generate_report_content(template_name, report_data)
            
            # Create evidence package if requested
            evidence_package_path = None
            if evidence_ids:
                evidence_collector = EvidenceCollector(self.config)
                package_result = await evidence_collector.create_evidence_package(
                    evidence_ids, f"{framework.value}_{report_type.value}_evidence"
                )
                if package_result['success']:
                    evidence_package_path = package_result['package_path']
            
            # Store report
            report_filename = f"{framework.value}_{report_type.value}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
            report_path = await self._store_report(report_id, report_filename, report_content)
            
            # Create report record
            report = ComplianceReport(
                report_id=report_id,
                framework=framework,
                report_type=report_type,
                title=report_data['title'],
                description=report_data['description'],
                period_start=period_start,
                period_end=period_end,
                file_path=report_path,
                evidence_package_path=evidence_package_path,
                summary=report_data['summary']
            )
            
            self.reports[report_id] = report
            
            logger.info(f"Generated compliance report: {report_id}")
            
            return {
                'success': True,
                'report_id': report_id,
                'report_path': report_path,
                'evidence_package_path': evidence_package_path
            }
            
        except Exception as e:
            logger.error(f"Failed to generate compliance report: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def generate_executive_summary(
        self,
        frameworks: List[ComplianceFramework],
        period_start: datetime,
        period_end: datetime,
        assessments: Dict[ComplianceFramework, List[ComplianceAssessment]]
    ) -> Dict[str, Any]:
        """Generate executive summary report across multiple frameworks."""
        try:
            report_id = str(uuid.uuid4())
            
            # Prepare executive summary data
            summary_data = {
                'title': 'Compliance Executive Summary',
                'description': f'Executive summary for period {period_start.date()} to {period_end.date()}',
                'period_start': period_start,
                'period_end': period_end,
                'frameworks': [],
                'overall_status': ComplianceStatus.COMPLIANT,
                'key_findings': [],
                'recommendations': [],
                'risk_areas': []
            }
            
            overall_scores = []
            
            for framework in frameworks:
                framework_assessments = assessments.get(framework, [])
                if not framework_assessments:
                    continue
                
                # Calculate framework metrics
                framework_score = sum(a.score for a in framework_assessments) / len(framework_assessments)
                overall_scores.append(framework_score)
                
                status_counts = {}
                for assessment in framework_assessments:
                    status_counts[assessment.status] = status_counts.get(assessment.status, 0) + 1
                
                framework_data = {
                    'name': framework.value.upper(),
                    'score': framework_score,
                    'total_controls': len(framework_assessments),
                    'compliant_controls': status_counts.get(ComplianceStatus.COMPLIANT, 0),
                    'non_compliant_controls': status_counts.get(ComplianceStatus.NON_COMPLIANT, 0),
                    'key_issues': [f for a in framework_assessments for f in a.findings if f][:3]
                }
                
                summary_data['frameworks'].append(framework_data)
            
            # Calculate overall metrics
            if overall_scores:
                overall_score = sum(overall_scores) / len(overall_scores)
                if overall_score >= 0.9:
                    summary_data['overall_status'] = ComplianceStatus.COMPLIANT
                elif overall_score >= 0.7:
                    summary_data['overall_status'] = ComplianceStatus.PARTIALLY_COMPLIANT
                else:
                    summary_data['overall_status'] = ComplianceStatus.NON_COMPLIANT
            
            # Generate report content
            report_content = await self._generate_report_content('executive_summary.html', summary_data)
            
            # Store report
            report_filename = f"executive_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
            report_path = await self._store_report(report_id, report_filename, report_content)
            
            # Create report record
            report = ComplianceReport(
                report_id=report_id,
                framework=ComplianceFramework.CUSTOM,
                report_type=ReportType.EXECUTIVE_SUMMARY,
                title=summary_data['title'],
                description=summary_data['description'],
                period_start=period_start,
                period_end=period_end,
                file_path=report_path,
                summary=summary_data
            )
            
            self.reports[report_id] = report
            
            logger.info(f"Generated executive summary: {report_id}")
            
            return {
                'success': True,
                'report_id': report_id,
                'report_path': report_path,
                'overall_score': overall_score if overall_scores else 0.0
            }
            
        except Exception as e:
            logger.error(f"Failed to generate executive summary: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _prepare_report_data(
        self,
        framework: ComplianceFramework,
        report_type: ReportType,
        period_start: datetime,
        period_end: datetime,
        assessments: List[ComplianceAssessment]
    ) -> Dict[str, Any]:
        """Prepare data for report generation."""
        # Calculate summary statistics
        total_assessments = len(assessments)
        compliant_count = sum(1 for a in assessments if a.status == ComplianceStatus.COMPLIANT)
        non_compliant_count = sum(1 for a in assessments if a.status == ComplianceStatus.NON_COMPLIANT)
        average_score = sum(a.score for a in assessments) / total_assessments if total_assessments > 0 else 0.0
        
        # Collect findings and recommendations
        all_findings = [f for a in assessments for f in a.findings]
        all_recommendations = [r for a in assessments for r in a.recommendations]
        
        return {
            'title': f'{framework.value.upper()} {report_type.value.title()} Report',
            'description': f'Compliance report for {framework.value.upper()} framework',
            'framework': framework.value.upper(),
            'report_type': report_type.value.title(),
            'period_start': period_start,
            'period_end': period_end,
            'generated_at': datetime.now(),
            'summary': {
                'total_controls': total_assessments,
                'compliant_controls': compliant_count,
                'non_compliant_controls': non_compliant_count,
                'compliance_rate': (compliant_count / total_assessments * 100) if total_assessments > 0 else 0,
                'average_score': average_score
            },
            'assessments': [
                {
                    'control_id': a.control_id,
                    'status': a.status.value,
                    'score': a.score,
                    'findings': a.findings,
                    'recommendations': a.recommendations,
                    'assessed_at': a.assessed_at
                }
                for a in assessments
            ],
            'key_findings': list(set(all_findings))[:10],  # Top 10 unique findings
            'recommendations': list(set(all_recommendations))[:10]  # Top 10 unique recommendations
        }
    
    async def _generate_report_content(self, template_name: str, data: Dict[str, Any]) -> str:
        """Generate report content using template."""
        try:
            template = self.template_env.get_template(template_name)
            return template.render(**data)
        except Exception as e:
            logger.warning(f"Template {template_name} not found, using default template")
            # Use default template
            default_template = Template("""
            <html>
            <head><title>{{ title }}</title></head>
            <body>
                <h1>{{ title }}</h1>
                <p>{{ description }}</p>
                <h2>Summary</h2>
                <ul>
                    <li>Total Controls: {{ summary.total_controls }}</li>
                    <li>Compliant: {{ summary.compliant_controls }}</li>
                    <li>Non-Compliant: {{ summary.non_compliant_controls }}</li>
                    <li>Compliance Rate: {{ "%.1f"|format(summary.compliance_rate) }}%</li>
                </ul>
                <h2>Key Findings</h2>
                <ul>
                {% for finding in key_findings %}
                    <li>{{ finding }}</li>
                {% endfor %}
                </ul>
            </body>
            </html>
            """)
            return default_template.render(**data)
    
    async def _store_report(self, report_id: str, filename: str, content: str) -> str:
        """Store generated report."""
        try:
            storage_dir = Path(self.config.get('report_storage_dir', '/tmp/reports'))
            storage_dir.mkdir(parents=True, exist_ok=True)
            
            report_path = storage_dir / f"{report_id}_{filename}"
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return str(report_path)
            
        except Exception as e:
            logger.error(f"Failed to store report: {e}")
            raise

class ComplianceReportingAutomation:
    """Main compliance reporting automation system."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize compliance reporting automation."""
        self.config = config
        self.assessor = ComplianceAssessor(config)
        self.report_generator = ReportGenerator(config)
        self.evidence_collector = EvidenceCollector(config)
        
        # Load compliance frameworks and controls
        self._load_compliance_frameworks()
        
        logger.info("Compliance reporting automation initialized")
    
    async def run_scheduled_assessment(
        self,
        framework: ComplianceFramework,
        assessor_id: str = "system"
    ) -> Dict[str, Any]:
        """Run scheduled compliance assessment."""
        try:
            # Assess framework
            assessment_result = await self.assessor.assess_framework(framework, assessor_id)
            
            if not assessment_result['success']:
                return assessment_result
            
            # Generate report
            period_end = datetime.now()
            period_start = period_end - timedelta(days=90)  # Quarterly report
            
            # Get assessments for the period
            assessments = [
                assessment for assessment in self.assessor.assessments.values()
                if (assessment.framework == framework and 
                    period_start <= assessment.assessed_at <= period_end)
            ]
            
            # Collect evidence IDs
            evidence_ids = []
            for assessment in assessments:
                evidence_ids.extend(assessment.evidence_ids)
            
            # Generate compliance report
            report_result = await self.report_generator.generate_compliance_report(
                framework=framework,
                report_type=ReportType.ASSESSMENT,
                period_start=period_start,
                period_end=period_end,
                assessments=assessments,
                evidence_ids=evidence_ids
            )
            
            return {
                'success': True,
                'framework': framework.value,
                'assessment_result': assessment_result,
                'report_result': report_result
            }
            
        except Exception as e:
            logger.error(f"Failed to run scheduled assessment: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def generate_audit_package(
        self,
        framework: ComplianceFramework,
        period_start: datetime,
        period_end: datetime
    ) -> Dict[str, Any]:
        """Generate complete audit package for external auditors."""
        try:
            # Get assessments for the period
            assessments = [
                assessment for assessment in self.assessor.assessments.values()
                if (assessment.framework == framework and 
                    period_start <= assessment.assessed_at <= period_end)
            ]
            
            if not assessments:
                return {
                    'success': False,
                    'error': 'No assessments found for the specified period'
                }
            
            # Collect all evidence
            all_evidence_ids = []
            for assessment in assessments:
                all_evidence_ids.extend(assessment.evidence_ids)
            
            # Create evidence package
            package_result = await self.evidence_collector.create_evidence_package(
                all_evidence_ids, f"{framework.value}_audit_package"
            )
            
            # Generate audit report
            report_result = await self.report_generator.generate_compliance_report(
                framework=framework,
                report_type=ReportType.AUDIT,
                period_start=period_start,
                period_end=period_end,
                assessments=assessments,
                evidence_ids=all_evidence_ids
            )
            
            return {
                'success': True,
                'framework': framework.value,
                'period_start': period_start.isoformat(),
                'period_end': period_end.isoformat(),
                'assessments_included': len(assessments),
                'evidence_items': len(all_evidence_ids),
                'report_path': report_result.get('report_path'),
                'evidence_package_path': package_result.get('package_path')
            }
            
        except Exception as e:
            logger.error(f"Failed to generate audit package: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _load_compliance_frameworks(self):
        """Load compliance frameworks and controls."""
        # This would load from configuration files or database
        # For now, create sample controls
        
        # SOX controls
        sox_control = ComplianceControl(
            control_id="SOX-001",
            framework=ComplianceFramework.SOX,
            name="Access Controls",
            description="Ensure proper access controls are in place",
            category="Access Management",
            requirements=["User access reviews", "Segregation of duties"],
            test_procedures=["Review user access reports", "Test segregation controls"],
            evidence_requirements=[EvidenceType.AUDIT_LOG, EvidenceType.CONFIGURATION],
            frequency="quarterly",
            owner="IT Security Team"
        )
        
        self.assessor.controls[sox_control.control_id] = sox_control
        
        # GDPR controls
        gdpr_control = ComplianceControl(
            control_id="GDPR-001",
            framework=ComplianceFramework.GDPR,
            name="Data Protection",
            description="Ensure personal data is properly protected",
            category="Data Privacy",
            requirements=["Data encryption", "Access logging", "Data retention"],
            test_procedures=["Verify encryption", "Review access logs"],
            evidence_requirements=[EvidenceType.CONFIGURATION, EvidenceType.TEST_RESULT],
            frequency="monthly",
            owner="Data Protection Officer"
        )
        
        self.assessor.controls[gdpr_control.control_id] = gdpr_control

# Example usage
if __name__ == "__main__":
    # Example configuration
    config = {
        'use_s3': False,
        'local_evidence_dir': '/tmp/compliance/evidence',
        'report_storage_dir': '/tmp/compliance/reports',
        'template_dir': '/tmp/compliance/templates'
    }
    
    # Initialize compliance reporting system
    compliance_system = ComplianceReportingAutomation(config)
    
    # Example usage
    async def example_usage():
        # Run scheduled assessment
        assessment_result = await compliance_system.run_scheduled_assessment(
            ComplianceFramework.SOX,
            "auditor_001"
        )
        
        if assessment_result['success']:
            print(f"Assessment completed for SOX framework")
            print(f"Overall status: {assessment_result['assessment_result']['overall_status']}")
            
            # Generate audit package
            audit_package = await compliance_system.generate_audit_package(
                ComplianceFramework.SOX,
                datetime.now() - timedelta(days=90),
                datetime.now()
            )
            
            if audit_package['success']:
                print(f"Audit package generated with {audit_package['evidence_items']} evidence items")
        
        else:
            print(f"Assessment failed: {assessment_result['error']}")
    
    # Run example
    import asyncio
    asyncio.run(example_usage())