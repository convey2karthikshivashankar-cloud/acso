"""
Data Export/Import Service for ACSO Phase 5 Agentic Demonstrations.

This module provides comprehensive data export and import capabilities for demo scenarios,
including data packaging, compression, validation, and cross-environment sharing.
"""

import asyncio
import json
import gzip
import zipfile
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Union, BinaryIO
from enum import Enum
from dataclasses import dataclass, field
from pathlib import Path
import logging
import base64
import hashlib

from .demo_data_store import DataType, demo_data_store

logger = logging.getLogger(__name__)


class ExportFormat(str, Enum):
    """Export format types."""
    JSON = "json"
    JSON_COMPRESSED = "json_gz"
    BINARY = "binary"
    ZIP_ARCHIVE = "zip"
    CSV = "csv"


class ImportValidation(str, Enum):
    """Import validation levels."""
    NONE = "none"
    BASIC = "basic"
    STRICT = "strict"
    CUSTOM = "custom"


@dataclass
class ExportManifest:
    """Manifest for exported data packages."""
    export_id: str
    created_at: datetime
    created_by: str
    version: str
    description: str
    data_types: List[str]
    store_ids: List[str]
    format: ExportFormat
    compression: bool
    checksum: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "export_id": self.export_id,
            "created_at": self.created_at.isoformat(),
            "created_by": self.created_by,
            "version": self.version,
            "description": self.description,
            "data_types": self.data_types,
            "store_ids": self.store_ids,
            "format": self.format.value,
            "compression": self.compression,
            "checksum": self.checksum,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ExportManifest':
        return cls(
            export_id=data["export_id"],
            created_at=datetime.fromisoformat(data["created_at"]),
            created_by=data["created_by"],
            version=data["version"],
            description=data["description"],
            data_types=data["data_types"],
            store_ids=data["store_ids"],
            format=ExportFormat(data["format"]),
            compression=data["compression"],
            checksum=data["checksum"],
            metadata=data.get("metadata", {})
        )


@dataclass
class ImportResult:
    """Result of an import operation."""
    success: bool
    import_id: str
    imported_stores: List[str]
    imported_data_types: List[str]
    validation_errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    statistics: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "import_id": self.import_id,
            "imported_stores": self.imported_stores,
            "imported_data_types": self.imported_data_types,
            "validation_errors": self.validation_errors,
            "warnings": self.warnings,
            "statistics": self.statistics
        }


class DataExportImportService:
    """Service for exporting and importing demo data."""
    
    def __init__(self, storage_path: str = "exports"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(exist_ok=True)
        
        self.exports: Dict[str, ExportManifest] = {}
        self.import_history: List[ImportResult] = []
        
        # Configuration
        self.config = {
            "max_export_size": 100 * 1024 * 1024,  # 100MB
            "compression_level": 6,
            "include_metadata": True,
            "include_operations_history": False,
            "include_snapshots": False,
            "validation_level": ImportValidation.BASIC,
            "auto_backup_on_import": True
        }
        
    async def export_data(self, export_config: Dict[str, Any]) -> Optional[str]:
        """Export data based on configuration."""
        try:\n            # Validate export configuration\n            if not self._validate_export_config(export_config):\n                return None\n                \n            export_id = str(uuid.uuid4())\n            \n            # Collect data\n            export_data = await self._collect_export_data(export_config)\n            \n            # Create manifest\n            manifest = ExportManifest(\n                export_id=export_id,\n                created_at=datetime.utcnow(),\n                created_by=export_config.get(\"created_by\", \"system\"),\n                version=\"1.0\",\n                description=export_config.get(\"description\", \"\"),\n                data_types=export_config.get(\"data_types\", []),\n                store_ids=export_config.get(\"store_ids\", []),\n                format=ExportFormat(export_config.get(\"format\", ExportFormat.JSON)),\n                compression=export_config.get(\"compression\", True),\n                checksum=\"\",  # Will be calculated\n                metadata=export_config.get(\"metadata\", {})\n            )\n            \n            # Export data\n            export_path = await self._write_export_data(manifest, export_data)\n            \n            if export_path:\n                # Calculate checksum\n                manifest.checksum = await self._calculate_checksum(export_path)\n                \n                # Save manifest\n                await self._save_manifest(manifest)\n                \n                self.exports[export_id] = manifest\n                \n                logger.info(f\"Exported data to {export_path} with ID {export_id}\")\n                return export_id\n            else:\n                logger.error(f\"Failed to write export data for {export_id}\")\n                return None\n                \n        except Exception as e:\n            logger.error(f\"Export failed: {e}\")\n            return None\n            \n    async def import_data(self, import_source: Union[str, Path, bytes], \n                         import_config: Optional[Dict[str, Any]] = None) -> ImportResult:\n        \"\"\"Import data from various sources.\"\"\"\n        import_id = str(uuid.uuid4())\n        import_config = import_config or {}\n        \n        result = ImportResult(\n            success=False,\n            import_id=import_id,\n            imported_stores=[],\n            imported_data_types=[]\n        )\n        \n        try:\n            # Load import data\n            import_data, manifest = await self._load_import_data(import_source)\n            \n            if not import_data:\n                result.validation_errors.append(\"Failed to load import data\")\n                return result\n                \n            # Validate import data\n            validation_level = ImportValidation(import_config.get(\n                \"validation_level\", self.config[\"validation_level\"]\n            ))\n            \n            validation_errors = await self._validate_import_data(\n                import_data, manifest, validation_level\n            )\n            \n            if validation_errors:\n                result.validation_errors.extend(validation_errors)\n                if validation_level == ImportValidation.STRICT:\n                    return result\n                    \n            # Create backup if requested\n            if import_config.get(\"auto_backup\", self.config[\"auto_backup_on_import\"]):\n                backup_id = await self._create_import_backup(import_data.get(\"store_ids\", []))\n                if backup_id:\n                    result.statistics[\"backup_id\"] = backup_id\n                    \n            # Import data\n            success = await self._apply_import_data(import_data, import_config)\n            \n            if success:\n                result.success = True\n                result.imported_stores = import_data.get(\"store_ids\", [])\n                result.imported_data_types = list(import_data.get(\"data\", {}).keys())\n                \n                # Calculate statistics\n                result.statistics.update(await self._calculate_import_statistics(import_data))\n                \n                logger.info(f\"Successfully imported data with ID {import_id}\")\n            else:\n                result.validation_errors.append(\"Failed to apply import data\")\n                \n        except Exception as e:\n            logger.error(f\"Import failed: {e}\")\n            result.validation_errors.append(f\"Import error: {str(e)}\")\n            \n        finally:\n            self.import_history.append(result)\n            \n        return result\n        \n    async def list_exports(self) -> List[Dict[str, Any]]:\n        \"\"\"List all available exports.\"\"\"\n        exports = []\n        \n        # Add in-memory exports\n        for manifest in self.exports.values():\n            exports.append(manifest.to_dict())\n            \n        # Add exports from storage\n        for manifest_file in self.storage_path.glob(\"*.manifest.json\"):\n            try:\n                with open(manifest_file, 'r') as f:\n                    manifest_data = json.load(f)\n                    if manifest_data[\"export_id\"] not in self.exports:\n                        exports.append(manifest_data)\n            except Exception as e:\n                logger.error(f\"Failed to load manifest {manifest_file}: {e}\")\n                \n        return exports\n        \n    async def get_export_info(self, export_id: str) -> Optional[Dict[str, Any]]:\n        \"\"\"Get information about a specific export.\"\"\"\n        if export_id in self.exports:\n            return self.exports[export_id].to_dict()\n            \n        # Try to load from storage\n        manifest_file = self.storage_path / f\"{export_id}.manifest.json\"\n        if manifest_file.exists():\n            try:\n                with open(manifest_file, 'r') as f:\n                    return json.load(f)\n            except Exception as e:\n                logger.error(f\"Failed to load manifest for {export_id}: {e}\")\n                \n        return None\n        \n    async def delete_export(self, export_id: str) -> bool:\n        \"\"\"Delete an export.\"\"\"\n        try:\n            # Remove from memory\n            if export_id in self.exports:\n                del self.exports[export_id]\n                \n            # Remove files\n            for pattern in [f\"{export_id}.*\", f\"{export_id}_*\"]:\n                for file_path in self.storage_path.glob(pattern):\n                    file_path.unlink()\n                    \n            logger.info(f\"Deleted export {export_id}\")\n            return True\n            \n        except Exception as e:\n            logger.error(f\"Failed to delete export {export_id}: {e}\")\n            return False\n            \n    async def export_scenario_template(self, template_config: Dict[str, Any]) -> Optional[str]:\n        \"\"\"Export a scenario template with sample data.\"\"\"\n        try:\n            # Create template-specific export configuration\n            export_config = {\n                \"description\": f\"Scenario Template: {template_config.get('name', 'Unnamed')}\",\n                \"format\": ExportFormat.ZIP_ARCHIVE,\n                \"compression\": True,\n                \"include_sample_data\": True,\n                \"include_configuration\": True,\n                \"template_metadata\": template_config,\n                **template_config.get(\"export_config\", {})\n            }\n            \n            return await self.export_data(export_config)\n            \n        except Exception as e:\n            logger.error(f\"Failed to export scenario template: {e}\")\n            return None\n            \n    async def import_scenario_template(self, template_source: Union[str, Path, bytes],\n                                     scenario_config: Optional[Dict[str, Any]] = None) -> ImportResult:\n        \"\"\"Import a scenario template.\"\"\"\n        import_config = {\n            \"validation_level\": ImportValidation.BASIC,\n            \"auto_backup\": True,\n            \"scenario_mode\": True,\n            **(scenario_config or {})\n        }\n        \n        return await self.import_data(template_source, import_config)\n        \n    def _validate_export_config(self, config: Dict[str, Any]) -> bool:\n        \"\"\"Validate export configuration.\"\"\"\n        required_fields = [\"store_ids\"]\n        \n        for field in required_fields:\n            if field not in config:\n                logger.error(f\"Missing required field: {field}\")\n                return False\n                \n        # Validate format\n        format_str = config.get(\"format\", ExportFormat.JSON.value)\n        try:\n            ExportFormat(format_str)\n        except ValueError:\n            logger.error(f\"Invalid export format: {format_str}\")\n            return False\n            \n        return True\n        \n    async def _collect_export_data(self, config: Dict[str, Any]) -> Dict[str, Any]:\n        \"\"\"Collect data for export.\"\"\"\n        export_data = {\n            \"version\": \"1.0\",\n            \"export_timestamp\": datetime.utcnow().isoformat(),\n            \"stores\": {},\n            \"metadata\": config.get(\"metadata\", {})\n        }\n        \n        store_ids = config.get(\"store_ids\", [])\n        data_types = config.get(\"data_types\")\n        \n        if data_types:\n            data_types = [DataType(dt) for dt in data_types]\n        else:\n            data_types = list(DataType)\n            \n        for store_id in store_ids:\n            store = await demo_data_store.get_store(store_id)\n            if store:\n                store_data = {\n                    \"store_id\": store_id,\n                    \"data\": {},\n                    \"statistics\": await store.get_statistics()\n                }\n                \n                for data_type in data_types:\n                    store_data[\"data\"][data_type.value] = await store.get_all(data_type)\n                    \n                # Include additional data if requested\n                if config.get(\"include_operations_history\", self.config[\"include_operations_history\"]):\n                    store_data[\"operations\"] = [op.to_dict() for op in store.operations]\n                    \n                if config.get(\"include_snapshots\", self.config[\"include_snapshots\"]):\n                    store_data[\"snapshots\"] = {\n                        snap_id: snap.to_dict() \n                        for snap_id, snap in store.snapshots.items()\n                    }\n                    \n                export_data[\"stores\"][store_id] = store_data\n                \n        return export_data\n        \n    async def _write_export_data(self, manifest: ExportManifest, \n                               export_data: Dict[str, Any]) -> Optional[Path]:\n        \"\"\"Write export data to file.\"\"\"\n        try:\n            base_filename = f\"{manifest.export_id}\"\n            \n            if manifest.format == ExportFormat.JSON:\n                file_path = self.storage_path / f\"{base_filename}.json\"\n                with open(file_path, 'w') as f:\n                    json.dump(export_data, f, indent=2)\n                    \n            elif manifest.format == ExportFormat.JSON_COMPRESSED:\n                file_path = self.storage_path / f\"{base_filename}.json.gz\"\n                with gzip.open(file_path, 'wt') as f:\n                    json.dump(export_data, f, indent=2)\n                    \n            elif manifest.format == ExportFormat.ZIP_ARCHIVE:\n                file_path = self.storage_path / f\"{base_filename}.zip\"\n                with zipfile.ZipFile(file_path, 'w', zipfile.ZIP_DEFLATED) as zf:\n                    # Add main data file\n                    zf.writestr(\"data.json\", json.dumps(export_data, indent=2))\n                    \n                    # Add manifest\n                    zf.writestr(\"manifest.json\", json.dumps(manifest.to_dict(), indent=2))\n                    \n                    # Add individual store files\n                    for store_id, store_data in export_data.get(\"stores\", {}).items():\n                        zf.writestr(f\"stores/{store_id}.json\", \n                                  json.dumps(store_data, indent=2))\n                                  \n            else:\n                logger.error(f\"Unsupported export format: {manifest.format}\")\n                return None\n                \n            return file_path\n            \n        except Exception as e:\n            logger.error(f\"Failed to write export data: {e}\")\n            return None\n            \n    async def _load_import_data(self, source: Union[str, Path, bytes]) -> Tuple[Optional[Dict[str, Any]], Optional[ExportManifest]]:\n        \"\"\"Load import data from various sources.\"\"\"\n        try:\n            if isinstance(source, bytes):\n                # Load from bytes\n                data_str = source.decode('utf-8')\n                import_data = json.loads(data_str)\n                manifest = None\n                \n            elif isinstance(source, (str, Path)):\n                source_path = Path(source)\n                \n                if source_path.suffix == '.zip':\n                    # Load from ZIP archive\n                    with zipfile.ZipFile(source_path, 'r') as zf:\n                        # Load main data\n                        with zf.open('data.json') as f:\n                            import_data = json.load(f)\n                            \n                        # Load manifest if available\n                        try:\n                            with zf.open('manifest.json') as f:\n                                manifest_data = json.load(f)\n                                manifest = ExportManifest.from_dict(manifest_data)\n                        except KeyError:\n                            manifest = None\n                            \n                elif source_path.suffix == '.gz':\n                    # Load compressed JSON\n                    with gzip.open(source_path, 'rt') as f:\n                        import_data = json.load(f)\n                    manifest = None\n                    \n                else:\n                    # Load regular JSON\n                    with open(source_path, 'r') as f:\n                        import_data = json.load(f)\n                    manifest = None\n                    \n            else:\n                logger.error(f\"Unsupported import source type: {type(source)}\")\n                return None, None\n                \n            return import_data, manifest\n            \n        except Exception as e:\n            logger.error(f\"Failed to load import data: {e}\")\n            return None, None\n            \n    async def _validate_import_data(self, import_data: Dict[str, Any], \n                                  manifest: Optional[ExportManifest],\n                                  validation_level: ImportValidation) -> List[str]:\n        \"\"\"Validate import data.\"\"\"\n        errors = []\n        \n        if validation_level == ImportValidation.NONE:\n            return errors\n            \n        # Basic validation\n        if \"stores\" not in import_data:\n            errors.append(\"Missing 'stores' section in import data\")\n            return errors\n            \n        # Validate store data\n        for store_id, store_data in import_data[\"stores\"].items():\n            if \"data\" not in store_data:\n                errors.append(f\"Missing 'data' section for store {store_id}\")\n                continue\n                \n            # Validate data types\n            for data_type_str in store_data[\"data\"].keys():\n                try:\n                    DataType(data_type_str)\n                except ValueError:\n                    errors.append(f\"Invalid data type '{data_type_str}' in store {store_id}\")\n                    \n        # Strict validation\n        if validation_level == ImportValidation.STRICT:\n            # Validate manifest checksum if available\n            if manifest and manifest.checksum:\n                # This would validate the checksum\n                pass\n                \n            # Validate data consistency\n            # This would perform more thorough validation\n            pass\n            \n        return errors\n        \n    async def _apply_import_data(self, import_data: Dict[str, Any], \n                               config: Dict[str, Any]) -> bool:\n        \"\"\"Apply import data to stores.\"\"\"\n        try:\n            merge_mode = config.get(\"merge\", False)\n            \n            for store_id, store_data in import_data[\"stores\"].items():\n                # Get or create store\n                store = await demo_data_store.get_store(store_id)\n                if not store:\n                    if not await demo_data_store.create_store(store_id):\n                        logger.error(f\"Failed to create store {store_id}\")\n                        continue\n                    store = await demo_data_store.get_store(store_id)\n                    \n                if not store:\n                    continue\n                    \n                # Import data for each data type\n                for data_type_str, data_dict in store_data[\"data\"].items():\n                    try:\n                        data_type = DataType(data_type_str)\n                        \n                        if not merge_mode:\n                            # Clear existing data\n                            await store.clear(data_type)\n                            \n                        # Import data\n                        await store.batch_update(data_type, data_dict, {\n                            \"imported\": True,\n                            \"import_timestamp\": datetime.utcnow().isoformat(),\n                            \"import_source\": config.get(\"source\", \"unknown\")\n                        })\n                        \n                    except ValueError:\n                        logger.warning(f\"Skipping invalid data type: {data_type_str}\")\n                        \n            return True\n            \n        except Exception as e:\n            logger.error(f\"Failed to apply import data: {e}\")\n            return False\n            \n    async def _create_import_backup(self, store_ids: List[str]) -> Optional[str]:\n        \"\"\"Create backup before import.\"\"\"\n        try:\n            backup_config = {\n                \"description\": f\"Pre-import backup - {datetime.utcnow().isoformat()}\",\n                \"store_ids\": store_ids,\n                \"format\": ExportFormat.JSON_COMPRESSED,\n                \"compression\": True,\n                \"created_by\": \"import_service\"\n            }\n            \n            return await self.export_data(backup_config)\n            \n        except Exception as e:\n            logger.error(f\"Failed to create import backup: {e}\")\n            return None\n            \n    async def _calculate_import_statistics(self, import_data: Dict[str, Any]) -> Dict[str, Any]:\n        \"\"\"Calculate import statistics.\"\"\"\n        stats = {\n            \"stores_imported\": len(import_data.get(\"stores\", {})),\n            \"data_types_imported\": set(),\n            \"total_items_imported\": 0\n        }\n        \n        for store_data in import_data.get(\"stores\", {}).values():\n            for data_type_str, data_dict in store_data.get(\"data\", {}).items():\n                stats[\"data_types_imported\"].add(data_type_str)\n                stats[\"total_items_imported\"] += len(data_dict)\n                \n        stats[\"data_types_imported\"] = list(stats[\"data_types_imported\"])\n        \n        return stats\n        \n    async def _calculate_checksum(self, file_path: Path) -> str:\n        \"\"\"Calculate file checksum.\"\"\"\n        try:\n            hash_md5 = hashlib.md5()\n            with open(file_path, \"rb\") as f:\n                for chunk in iter(lambda: f.read(4096), b\"\"):\n                    hash_md5.update(chunk)\n            return hash_md5.hexdigest()\n        except Exception as e:\n            logger.error(f\"Failed to calculate checksum: {e}\")\n            return \"\"\n            \n    async def _save_manifest(self, manifest: ExportManifest):\n        \"\"\"Save export manifest.\"\"\"\n        try:\n            manifest_path = self.storage_path / f\"{manifest.export_id}.manifest.json\"\n            with open(manifest_path, 'w') as f:\n                json.dump(manifest.to_dict(), f, indent=2)\n        except Exception as e:\n            logger.error(f\"Failed to save manifest: {e}\")\n            \n    async def get_service_statistics(self) -> Dict[str, Any]:\n        \"\"\"Get service statistics.\"\"\"\n        return {\n            \"total_exports\": len(self.exports),\n            \"total_imports\": len(self.import_history),\n            \"successful_imports\": len([r for r in self.import_history if r.success]),\n            \"failed_imports\": len([r for r in self.import_history if not r.success]),\n            \"storage_path\": str(self.storage_path),\n            \"config\": self.config\n        }\n\n\n# Global data export/import service instance\ndata_export_import_service = DataExportImportService()"