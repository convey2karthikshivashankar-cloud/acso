"""
Data Management Module for ACSO Phase 5 Agentic Demonstrations.

This module provides comprehensive data management capabilities including:
- In-memory data stores with versioning and rollback
- Real-time data synchronization across components
- Data export and import for scenario sharing
- Conflict resolution and consistency management
"""

from .demo_data_store import (
    DataStore,
    DemoDataStore,
    DataType,
    DataOperation,
    DataSnapshot,
    demo_data_store
)
from .data_sync_service import (
    DataSyncService,
    SyncEvent,
    ConflictEvent,
    SyncOperation,
    ConflictResolution,
    data_sync_service
)
from .data_export_import import (
    DataExportImportService,
    ExportManifest,
    ImportResult,
    ExportFormat,
    ImportValidation,
    data_export_import_service
)

__all__ = [
    'DataStore',
    'DemoDataStore',
    'DataType',
    'DataOperation',
    'DataSnapshot',
    'demo_data_store',
    'DataSyncService',
    'SyncEvent',
    'ConflictEvent',
    'SyncOperation',
    'ConflictResolution',
    'data_sync_service',
    'DataExportImportService',
    'ExportManifest',
    'ImportResult',
    'ExportFormat',
    'ImportValidation',
    'data_export_import_service'
]"