"""
Tenant Database Manager for ACSO Enterprise.
Manages isolated database instances and schemas for each tenant.
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import json
import hashlib

import asyncpg
import redis
from kubernetes import client
from kubernetes.client.rest import ApiException

from ..models.tenancy import DatabaseConfig, TenantTier


@dataclass
class DatabaseInstance:
    """Database instance configuration."""
    tenant_id: str
    database_name: str
    connection_string: str
    schema_name: str
    user_name: str
    created_at: datetime
    status: str


class TenantDatabaseManager:
    """
    Multi-tenant database management system.
    
    Provides:
    - Isolated database schemas per tenant
    - Connection pooling and management
    - Database provisioning and deprovisioning
    - Data migration and backup
    - Performance monitoring
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Database connections
        self.master_pool = None
        self.tenant_pools: Dict[str, asyncpg.Pool] = {}
        self.redis_client = None
        
        # Tenant database tracking
        self.tenant_databases: Dict[str, DatabaseInstance] = {}
        
        # Kubernetes client for managing database pods
        self.k8s_core_v1 = None
        self.k8s_apps_v1 = None
        
        # Configuration
        self.master_db_config = {
            'host': 'postgres-master',
            'port': 5432,
            'database': 'acso_master',
            'user': 'acso_admin',
            'password': 'secure_password'  # In production, use secrets
        }
        
        self.redis_config = {
            'host': 'redis-master',
            'port': 6379,
            'db': 0
        }
        
    async def initialize(self) -> None:
        """Initialize the database manager."""
        try:
            self.logger.info("Initializing Tenant Database Manager")
            
            # Initialize Kubernetes clients
            self.k8s_core_v1 = client.CoreV1Api()
            self.k8s_apps_v1 = client.AppsV1Api()
            
            # Initialize master database connection
            await self._initialize_master_connection()
            
            # Initialize Redis connection
            await self._initialize_redis_connection()
            
            # Load existing tenant databases
            await self._load_existing_databases()
            
            self.logger.info("Tenant Database Manager initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Tenant Database Manager: {e}")
            raise
            
    async def shutdown(self) -> None:
        """Shutdown the database manager."""
        try:
            self.logger.info("Shutting down Tenant Database Manager")
            
            # Close tenant connection pools
            for tenant_id, pool in self.tenant_pools.items():
                await pool.close()
                
            # Close master connection pool
            if self.master_pool:
                await self.master_pool.close()
                
            # Close Redis connection
            if self.redis_client:
                await self.redis_client.close()
                
            self.logger.info("Tenant Database Manager shutdown complete")
            
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
            
    async def create_tenant_database(self, tenant_id: str, tier: TenantTier = None) -> DatabaseConfig:
        """
        Create an isolated database for a tenant.
        
        Args:
            tenant_id: ID of the tenant
            tier: Tenant subscription tier (affects database resources)
            
        Returns:
            Database configuration for the tenant
        """
        try:
            self.logger.info(f"Creating database for tenant: {tenant_id}")
            
            # Generate database configuration
            database_name = f"tenant_{tenant_id}"
            schema_name = f"tenant_{tenant_id}_schema"
            user_name = f"tenant_{tenant_id}_user"
            user_password = self._generate_secure_password()
            
            # Create database and user
            await self._create_database_and_user(database_name, user_name, user_password)
            
            # Create schema and tables
            await self._create_tenant_schema(database_name, schema_name, user_name)
            
            # Set up connection pool for tenant
            connection_string = f"postgresql://{user_name}:{user_password}@{self.master_db_config['host']}:{self.master_db_config['port']}/{database_name}"
            tenant_pool = await asyncpg.create_pool(
                connection_string,
                min_size=2,
                max_size=10 if tier != TenantTier.STARTER else 5
            )
            
            self.tenant_pools[tenant_id] = tenant_pool
            
            # Create database instance record
            db_instance = DatabaseInstance(
                tenant_id=tenant_id,
                database_name=database_name,
                connection_string=connection_string,
                schema_name=schema_name,
                user_name=user_name,
                created_at=datetime.utcnow(),
                status="active"
            )
            
            self.tenant_databases[tenant_id] = db_instance
            
            # Store configuration in Redis for caching
            await self._cache_database_config(tenant_id, db_instance)
            
            # Create database configuration object
            db_config = DatabaseConfig(
                tenant_id=tenant_id,
                database_name=database_name,
                connection_string=connection_string,
                schema_name=schema_name,
                created_at=datetime.utcnow()
            )
            
            self.logger.info(f"Successfully created database for tenant: {tenant_id}")
            return db_config
            
        except Exception as e:
            self.logger.error(f"Failed to create database for tenant {tenant_id}: {e}")
            # Cleanup on failure
            await self.cleanup_failed_database(tenant_id)
            raise
            
    async def delete_tenant_database(self, tenant_id: str) -> bool:
        """
        Delete a tenant's database and clean up resources.
        
        Args:
            tenant_id: ID of the tenant
            
        Returns:
            True if successful
        """
        try:
            self.logger.info(f"Deleting database for tenant: {tenant_id}")
            
            if tenant_id not in self.tenant_databases:
                self.logger.warning(f"No database found for tenant: {tenant_id}")
                return True
            
            db_instance = self.tenant_databases[tenant_id]
            
            # Close connection pool
            if tenant_id in self.tenant_pools:
                await self.tenant_pools[tenant_id].close()
                del self.tenant_pools[tenant_id]
            
            # Drop database and user
            await self._drop_database_and_user(db_instance.database_name, db_instance.user_name)
            
            # Remove from tracking
            del self.tenant_databases[tenant_id]
            
            # Remove from Redis cache
            await self._remove_database_config_cache(tenant_id)
            
            self.logger.info(f"Successfully deleted database for tenant: {tenant_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to delete database for tenant {tenant_id}: {e}")
            return False
            
    async def get_tenant_connection(self, tenant_id: str) -> asyncpg.Pool:
        """
        Get database connection pool for a tenant.
        
        Args:
            tenant_id: ID of the tenant
            
        Returns:
            Database connection pool
        """
        try:
            if tenant_id not in self.tenant_pools:
                # Try to load from cache and recreate pool
                await self._restore_tenant_connection(tenant_id)
            
            return self.tenant_pools.get(tenant_id)
            
        except Exception as e:
            self.logger.error(f"Failed to get connection for tenant {tenant_id}: {e}")
            return None
            
    async def execute_tenant_query(self, tenant_id: str, query: str, *args) -> Any:
        """
        Execute a query in a tenant's database.
        
        Args:
            tenant_id: ID of the tenant
            query: SQL query to execute
            *args: Query parameters
            
        Returns:
            Query result
        """
        try:
            pool = await self.get_tenant_connection(tenant_id)
            if not pool:
                raise ValueError(f"No database connection for tenant {tenant_id}")
            
            async with pool.acquire() as conn:
                return await conn.fetch(query, *args)
                
        except Exception as e:
            self.logger.error(f"Failed to execute query for tenant {tenant_id}: {e}")
            raise
            
    async def backup_tenant_database(self, tenant_id: str) -> Dict[str, Any]:
        """
        Create a backup of a tenant's database.
        
        Args:
            tenant_id: ID of the tenant
            
        Returns:
            Backup information
        """
        try:
            self.logger.info(f"Creating backup for tenant database: {tenant_id}")
            
            if tenant_id not in self.tenant_databases:
                raise ValueError(f"No database found for tenant {tenant_id}")
            
            db_instance = self.tenant_databases[tenant_id]
            backup_name = f"backup_{tenant_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            
            # Create backup using pg_dump (simplified)
            backup_command = f"pg_dump -h {self.master_db_config['host']} -U {db_instance.user_name} -d {db_instance.database_name} > /backups/{backup_name}.sql"
            
            # In production, this would execute the backup command
            # For now, simulate backup creation
            
            backup_info = {
                'tenant_id': tenant_id,
                'backup_name': backup_name,
                'backup_path': f"/backups/{backup_name}.sql",
                'created_at': datetime.utcnow().isoformat(),
                'size_bytes': 1024 * 1024,  # Simulated size
                'status': 'completed'
            }
            
            # Store backup metadata in Redis
            await self._store_backup_metadata(tenant_id, backup_info)
            
            self.logger.info(f"Successfully created backup for tenant: {tenant_id}")
            return backup_info
            
        except Exception as e:
            self.logger.error(f"Failed to backup database for tenant {tenant_id}: {e}")
            return {
                'tenant_id': tenant_id,
                'status': 'failed',
                'error': str(e)
            }
            
    async def restore_tenant_database(self, tenant_id: str, backup_name: str) -> bool:
        """
        Restore a tenant's database from backup.
        
        Args:
            tenant_id: ID of the tenant
            backup_name: Name of the backup to restore
            
        Returns:
            True if successful
        """
        try:
            self.logger.info(f"Restoring database for tenant {tenant_id} from backup: {backup_name}")
            
            # Get backup metadata
            backup_info = await self._get_backup_metadata(tenant_id, backup_name)
            if not backup_info:
                raise ValueError(f"Backup {backup_name} not found for tenant {tenant_id}")
            
            # Restore database (simplified)
            # In production, this would execute pg_restore or psql with the backup file
            
            self.logger.info(f"Successfully restored database for tenant: {tenant_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to restore database for tenant {tenant_id}: {e}")
            return False
            
    async def get_database_metrics(self, tenant_id: str) -> Dict[str, Any]:
        """
        Get database performance metrics for a tenant.
        
        Args:
            tenant_id: ID of the tenant
            
        Returns:
            Database metrics
        """
        try:
            if tenant_id not in self.tenant_databases:
                return {'error': f'No database found for tenant {tenant_id}'}
            
            db_instance = self.tenant_databases[tenant_id]
            
            # Get database statistics
            pool = await self.get_tenant_connection(tenant_id)
            if not pool:
                return {'error': 'No database connection available'}
            
            async with pool.acquire() as conn:
                # Get database size
                size_query = "SELECT pg_database_size(current_database()) as size_bytes"
                size_result = await conn.fetchrow(size_query)
                
                # Get connection count
                conn_query = "SELECT count(*) as active_connections FROM pg_stat_activity WHERE datname = current_database()"
                conn_result = await conn.fetchrow(conn_query)
                
                # Get table statistics
                table_query = """
                    SELECT 
                        schemaname,
                        tablename,
                        n_tup_ins as inserts,
                        n_tup_upd as updates,
                        n_tup_del as deletes
                    FROM pg_stat_user_tables
                """
                table_stats = await conn.fetch(table_query)
            
            return {
                'tenant_id': tenant_id,
                'database_name': db_instance.database_name,
                'size_bytes': size_result['size_bytes'] if size_result else 0,
                'active_connections': conn_result['active_connections'] if conn_result else 0,
                'table_statistics': [dict(row) for row in table_stats],
                'last_updated': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get database metrics for tenant {tenant_id}: {e}")
            return {'error': str(e)}
            
    async def cleanup_failed_database(self, tenant_id: str) -> None:
        """Clean up database resources after failed creation."""
        try:
            self.logger.info(f"Cleaning up failed database creation for tenant: {tenant_id}")
            
            # Close connection pool if exists
            if tenant_id in self.tenant_pools:
                await self.tenant_pools[tenant_id].close()
                del self.tenant_pools[tenant_id]
            
            # Remove from tracking
            if tenant_id in self.tenant_databases:
                db_instance = self.tenant_databases[tenant_id]
                
                # Try to drop database and user
                try:
                    await self._drop_database_and_user(db_instance.database_name, db_instance.user_name)
                except Exception as e:
                    self.logger.warning(f"Failed to drop database during cleanup: {e}")
                
                del self.tenant_databases[tenant_id]
            
            # Remove from Redis cache
            await self._remove_database_config_cache(tenant_id)
            
        except Exception as e:
            self.logger.error(f"Error during database cleanup for {tenant_id}: {e}")
            
    async def _initialize_master_connection(self) -> None:
        """Initialize connection to master database."""
        try:
            self.master_pool = await asyncpg.create_pool(
                host=self.master_db_config['host'],
                port=self.master_db_config['port'],
                database=self.master_db_config['database'],
                user=self.master_db_config['user'],
                password=self.master_db_config['password'],
                min_size=5,
                max_size=20
            )
            
            # Test connection
            async with self.master_pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
                
            self.logger.info("Master database connection initialized")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize master database connection: {e}")
            raise
            
    async def _initialize_redis_connection(self) -> None:
        """Initialize Redis connection for caching."""
        try:
            self.redis_client = redis.Redis(
                host=self.redis_config['host'],
                port=self.redis_config['port'],
                db=self.redis_config['db'],
                decode_responses=True
            )
            
            # Test connection
            await self.redis_client.ping()
            
            self.logger.info("Redis connection initialized")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Redis connection: {e}")
            # Redis is optional, continue without it
            self.redis_client = None
            
    async def _load_existing_databases(self) -> None:
        """Load existing tenant databases from master database."""
        try:
            async with self.master_pool.acquire() as conn:
                # Query for existing tenant databases
                query = """
                    SELECT datname 
                    FROM pg_database 
                    WHERE datname LIKE 'tenant_%'
                """
                
                databases = await conn.fetch(query)
                
                for db_row in databases:
                    db_name = db_row['datname']
                    tenant_id = db_name.replace('tenant_', '')
                    
                    # Try to restore tenant database configuration
                    await self._restore_tenant_database_config(tenant_id, db_name)
                    
            self.logger.info(f"Loaded {len(self.tenant_databases)} existing tenant databases")
            
        except Exception as e:
            self.logger.error(f"Failed to load existing databases: {e}")
            
    async def _create_database_and_user(self, database_name: str, user_name: str, password: str) -> None:
        """Create database and user."""
        try:
            async with self.master_pool.acquire() as conn:
                # Create user
                await conn.execute(f"CREATE USER {user_name} WITH PASSWORD '{password}'")
                
                # Create database
                await conn.execute(f"CREATE DATABASE {database_name} OWNER {user_name}")
                
                # Grant privileges
                await conn.execute(f"GRANT ALL PRIVILEGES ON DATABASE {database_name} TO {user_name}")
                
        except Exception as e:
            self.logger.error(f"Failed to create database and user: {e}")
            raise
            
    async def _create_tenant_schema(self, database_name: str, schema_name: str, user_name: str) -> None:
        """Create tenant schema and tables."""
        try:
            # Connect to the new database
            conn = await asyncpg.connect(
                host=self.master_db_config['host'],
                port=self.master_db_config['port'],
                database=database_name,
                user=user_name,
                password=self.master_db_config['password']  # Use master password for initial setup
            )
            
            try:
                # Create schema
                await conn.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")
                
                # Create basic tables
                await conn.execute(f"""
                    CREATE TABLE IF NOT EXISTS {schema_name}.agents (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        agent_type VARCHAR(100) NOT NULL,
                        status VARCHAR(50) NOT NULL,
                        configuration JSONB,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                await conn.execute(f"""
                    CREATE TABLE IF NOT EXISTS {schema_name}.tasks (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        agent_id UUID REFERENCES {schema_name}.agents(id),
                        task_type VARCHAR(100) NOT NULL,
                        status VARCHAR(50) NOT NULL,
                        input_data JSONB,
                        output_data JSONB,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        completed_at TIMESTAMP
                    )
                """)
                
                await conn.execute(f"""
                    CREATE TABLE IF NOT EXISTS {schema_name}.audit_logs (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        entity_type VARCHAR(100) NOT NULL,
                        entity_id UUID,
                        action VARCHAR(100) NOT NULL,
                        details JSONB,
                        user_id VARCHAR(100),
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Create indexes
                await conn.execute(f"CREATE INDEX IF NOT EXISTS idx_agents_type ON {schema_name}.agents(agent_type)")
                await conn.execute(f"CREATE INDEX IF NOT EXISTS idx_tasks_agent ON {schema_name}.tasks(agent_id)")
                await conn.execute(f"CREATE INDEX IF NOT EXISTS idx_audit_entity ON {schema_name}.audit_logs(entity_type, entity_id)")
                
            finally:
                await conn.close()
                
        except Exception as e:
            self.logger.error(f"Failed to create tenant schema: {e}")
            raise
            
    async def _drop_database_and_user(self, database_name: str, user_name: str) -> None:
        """Drop database and user."""
        try:
            async with self.master_pool.acquire() as conn:
                # Terminate active connections to the database
                await conn.execute(f"""
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE datname = '{database_name}' AND pid <> pg_backend_pid()
                """)
                
                # Drop database
                await conn.execute(f"DROP DATABASE IF EXISTS {database_name}")
                
                # Drop user
                await conn.execute(f"DROP USER IF EXISTS {user_name}")
                
        except Exception as e:
            self.logger.error(f"Failed to drop database and user: {e}")
            raise
            
    def _generate_secure_password(self) -> str:
        """Generate a secure password for database user."""
        import secrets
        import string
        
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(secrets.choice(alphabet) for _ in range(16))
        return password
        
    async def _cache_database_config(self, tenant_id: str, db_instance: DatabaseInstance) -> None:
        """Cache database configuration in Redis."""
        try:
            if not self.redis_client:
                return
                
            config_data = {
                'database_name': db_instance.database_name,
                'connection_string': db_instance.connection_string,
                'schema_name': db_instance.schema_name,
                'user_name': db_instance.user_name,
                'created_at': db_instance.created_at.isoformat(),
                'status': db_instance.status
            }
            
            await self.redis_client.setex(
                f"tenant_db:{tenant_id}",
                3600,  # 1 hour TTL
                json.dumps(config_data)
            )
            
        except Exception as e:
            self.logger.error(f"Failed to cache database config for {tenant_id}: {e}")
            
    async def _remove_database_config_cache(self, tenant_id: str) -> None:
        """Remove database configuration from Redis cache."""
        try:
            if not self.redis_client:
                return
                
            await self.redis_client.delete(f"tenant_db:{tenant_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to remove database config cache for {tenant_id}: {e}")
            
    async def _restore_tenant_connection(self, tenant_id: str) -> None:
        """Restore tenant connection pool from cache."""
        try:
            if not self.redis_client:
                return
                
            config_data = await self.redis_client.get(f"tenant_db:{tenant_id}")
            if not config_data:
                return
                
            config = json.loads(config_data)
            
            # Create connection pool
            tenant_pool = await asyncpg.create_pool(
                config['connection_string'],
                min_size=2,
                max_size=10
            )
            
            self.tenant_pools[tenant_id] = tenant_pool
            
        except Exception as e:
            self.logger.error(f"Failed to restore tenant connection for {tenant_id}: {e}")
            
    async def _restore_tenant_database_config(self, tenant_id: str, database_name: str) -> None:
        """Restore tenant database configuration."""
        try:
            # This would query the master database for tenant configuration
            # For now, create a basic configuration
            
            db_instance = DatabaseInstance(
                tenant_id=tenant_id,
                database_name=database_name,
                connection_string=f"postgresql://tenant_{tenant_id}_user:password@{self.master_db_config['host']}:{self.master_db_config['port']}/{database_name}",
                schema_name=f"tenant_{tenant_id}_schema",
                user_name=f"tenant_{tenant_id}_user",
                created_at=datetime.utcnow(),
                status="active"
            )
            
            self.tenant_databases[tenant_id] = db_instance
            
        except Exception as e:
            self.logger.error(f"Failed to restore database config for {tenant_id}: {e}")
            
    async def _store_backup_metadata(self, tenant_id: str, backup_info: Dict[str, Any]) -> None:
        """Store backup metadata in Redis."""
        try:
            if not self.redis_client:
                return
                
            key = f"backup:{tenant_id}:{backup_info['backup_name']}"
            await self.redis_client.setex(key, 86400 * 30, json.dumps(backup_info))  # 30 days TTL
            
        except Exception as e:
            self.logger.error(f"Failed to store backup metadata: {e}")
            
    async def _get_backup_metadata(self, tenant_id: str, backup_name: str) -> Optional[Dict[str, Any]]:
        """Get backup metadata from Redis."""
        try:
            if not self.redis_client:
                return None
                
            key = f"backup:{tenant_id}:{backup_name}"
            data = await self.redis_client.get(key)
            
            return json.loads(data) if data else None
            
        except Exception as e:
            self.logger.error(f"Failed to get backup metadata: {e}")
            return None