"""
Log streaming service for ACSO agents.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, AsyncGenerator, Set
from uuid import uuid4
from collections import deque

from ..models.agent import AgentLogEntry
from ..websocket.router import notify_agents_update
from ..utils.errors import ResourceNotFoundException

logger = logging.getLogger(__name__)


class LogStreamingService:
    """Service for streaming agent logs in real-time."""
    
    def __init__(self):
        # Active log streams
        self.active_streams: Dict[str, Dict[str, Any]] = {}
        
        # Log buffers for each agent
        self.log_buffers: Dict[str, deque] = {}
        
        # Stream subscribers
        self.stream_subscribers: Dict[str, Set[str]] = {}  # agent_id -> set of stream_ids
        
        # Log filters
        self.log_filters: Dict[str, Dict[str, Any]] = {}
        
        # Maximum buffer size per agent
        self.max_buffer_size = 10000
        
        # Log retention period
        self.log_retention_hours = 24
        
        # Background cleanup task
        asyncio.create_task(self._cleanup_old_logs())
    
    async def create_log_stream(
        self,
        agent_id: str,
        filters: Optional[Dict[str, Any]] = None,
        buffer_size: int = 1000
    ) -> str:
        """Create a new log stream for an agent."""
        stream_id = str(uuid4())
        
        # Initialize log buffer if needed
        if agent_id not in self.log_buffers:
            self.log_buffers[agent_id] = deque(maxlen=self.max_buffer_size)
        
        # Create stream configuration
        stream_config = {
            "stream_id": stream_id,
            "agent_id": agent_id,
            "created_at": datetime.utcnow(),
            "filters": filters or {},
            "buffer_size": min(buffer_size, self.max_buffer_size),
            "active": True,
            "last_activity": datetime.utcnow()
        }
        
        self.active_streams[stream_id] = stream_config
        
        # Add to subscribers
        if agent_id not in self.stream_subscribers:
            self.stream_subscribers[agent_id] = set()
        self.stream_subscribers[agent_id].add(stream_id)
        
        # Store filters for this stream
        self.log_filters[stream_id] = filters or {}
        
        logger.info(f"Created log stream {stream_id} for agent {agent_id}")
        return stream_id
    
    async def close_log_stream(self, stream_id: str):
        """Close a log stream."""
        if stream_id not in self.active_streams:
            return
        
        stream_config = self.active_streams[stream_id]
        agent_id = stream_config["agent_id"]
        
        # Remove from subscribers
        if agent_id in self.stream_subscribers:
            self.stream_subscribers[agent_id].discard(stream_id)
            if not self.stream_subscribers[agent_id]:
                del self.stream_subscribers[agent_id]
        
        # Clean up
        del self.active_streams[stream_id]
        if stream_id in self.log_filters:
            del self.log_filters[stream_id]
        
        logger.info(f"Closed log stream {stream_id}")
    
    async def add_log_entry(self, agent_id: str, log_entry: AgentLogEntry):
        """Add a log entry to the buffer and notify subscribers."""
        # Initialize buffer if needed
        if agent_id not in self.log_buffers:
            self.log_buffers[agent_id] = deque(maxlen=self.max_buffer_size)
        
        # Add to buffer
        self.log_buffers[agent_id].append({
            "timestamp": log_entry.timestamp,
            "level": log_entry.level,
            "message": log_entry.message,
            "component": log_entry.component,
            "task_id": log_entry.task_id,
            "metadata": log_entry.metadata
        })
        
        # Notify WebSocket subscribers
        await self._broadcast_log_entry(agent_id, log_entry)
        
        # Notify active streams
        await self._notify_stream_subscribers(agent_id, log_entry)
    
    async def get_buffered_logs(
        self,
        agent_id: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get buffered logs for an agent with optional filtering."""
        if agent_id not in self.log_buffers:
            return []
        
        logs = list(self.log_buffers[agent_id])
        
        # Apply filters
        if filters:
            logs = self._apply_log_filters(logs, filters)
        
        # Apply limit
        if limit:
            logs = logs[-limit:]
        
        return logs
    
    async def stream_logs(
        self,
        stream_id: str,
        include_buffered: bool = True
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream logs for a specific stream."""
        if stream_id not in self.active_streams:
            raise ResourceNotFoundException("Log stream", stream_id)
        
        stream_config = self.active_streams[stream_id]
        agent_id = stream_config["agent_id"]
        filters = stream_config["filters"]
        
        # Yield buffered logs first if requested
        if include_buffered:
            buffered_logs = await self.get_buffered_logs(
                agent_id, filters, stream_config["buffer_size"]
            )
            for log_entry in buffered_logs:
                if self._matches_filters(log_entry, filters):
                    yield {
                        "type": "log_entry",
                        "stream_id": stream_id,
                        "agent_id": agent_id,
                        "data": log_entry
                    }
        
        # Stream new logs
        last_check = datetime.utcnow()
        
        while stream_id in self.active_streams:
            try:
                # Check for new logs since last check
                if agent_id in self.log_buffers:
                    buffer = self.log_buffers[agent_id]
                    new_logs = [
                        log for log in buffer
                        if log["timestamp"] > last_check
                    ]
                    
                    for log_entry in new_logs:
                        if self._matches_filters(log_entry, filters):
                            yield {
                                "type": "log_entry",
                                "stream_id": stream_id,
                                "agent_id": agent_id,
                                "data": log_entry
                            }
                
                last_check = datetime.utcnow()
                
                # Update stream activity
                self.active_streams[stream_id]["last_activity"] = last_check
                
                # Wait before next check
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error in log stream {stream_id}: {e}")
                yield {
                    "type": "error",
                    "stream_id": stream_id,
                    "agent_id": agent_id,
                    "error": str(e)
                }
                break
    
    async def search_logs(
        self,
        agent_id: str,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Search logs for an agent."""
        if agent_id not in self.log_buffers:
            return []
        
        logs = list(self.log_buffers[agent_id])
        
        # Apply text search
        query_lower = query.lower()
        matching_logs = [
            log for log in logs
            if query_lower in log["message"].lower() or
               (log["component"] and query_lower in log["component"].lower())
        ]
        
        # Apply additional filters
        if filters:
            matching_logs = self._apply_log_filters(matching_logs, filters)
        
        # Sort by timestamp (newest first) and limit
        matching_logs.sort(key=lambda x: x["timestamp"], reverse=True)
        return matching_logs[:limit]
    
    async def export_logs(
        self,
        agent_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        filters: Optional[Dict[str, Any]] = None,
        format: str = "json"
    ) -> str:
        """Export logs for an agent in specified format."""
        if agent_id not in self.log_buffers:
            return ""
        
        logs = list(self.log_buffers[agent_id])
        
        # Apply time filters
        if start_time:
            logs = [log for log in logs if log["timestamp"] >= start_time]
        if end_time:
            logs = [log for log in logs if log["timestamp"] <= end_time]
        
        # Apply additional filters
        if filters:
            logs = self._apply_log_filters(logs, filters)
        
        # Sort by timestamp
        logs.sort(key=lambda x: x["timestamp"])
        
        # Format output
        if format.lower() == "json":
            return json.dumps(logs, indent=2, default=str)
        elif format.lower() == "csv":
            return self._format_logs_as_csv(logs)
        elif format.lower() == "text":
            return self._format_logs_as_text(logs)
        else:
            raise ValueError(f"Unsupported export format: {format}")
    
    async def get_log_statistics(self, agent_id: str) -> Dict[str, Any]:
        """Get log statistics for an agent."""
        if agent_id not in self.log_buffers:
            return {
                "total_logs": 0,
                "logs_by_level": {},
                "logs_by_component": {},
                "oldest_log": None,
                "newest_log": None
            }
        
        logs = list(self.log_buffers[agent_id])
        
        if not logs:
            return {
                "total_logs": 0,
                "logs_by_level": {},
                "logs_by_component": {},
                "oldest_log": None,
                "newest_log": None
            }
        
        # Count by level
        logs_by_level = {}
        for log in logs:
            level = log["level"]
            logs_by_level[level] = logs_by_level.get(level, 0) + 1
        
        # Count by component
        logs_by_component = {}
        for log in logs:
            component = log["component"] or "unknown"
            logs_by_component[component] = logs_by_component.get(component, 0) + 1
        
        # Find oldest and newest
        timestamps = [log["timestamp"] for log in logs]
        oldest_log = min(timestamps)
        newest_log = max(timestamps)
        
        return {
            "total_logs": len(logs),
            "logs_by_level": logs_by_level,
            "logs_by_component": logs_by_component,
            "oldest_log": oldest_log.isoformat() if oldest_log else None,
            "newest_log": newest_log.isoformat() if newest_log else None,
            "buffer_size": len(logs),
            "max_buffer_size": self.max_buffer_size
        }
    
    # Helper methods
    
    def _apply_log_filters(
        self,
        logs: List[Dict[str, Any]],
        filters: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Apply filters to a list of logs."""
        filtered_logs = logs
        
        # Level filter
        if "level" in filters:
            level = filters["level"].upper()
            filtered_logs = [log for log in filtered_logs if log["level"] == level]
        
        # Component filter
        if "component" in filters:
            component = filters["component"]
            filtered_logs = [
                log for log in filtered_logs
                if log["component"] == component
            ]
        
        # Task ID filter
        if "task_id" in filters:
            task_id = filters["task_id"]
            filtered_logs = [
                log for log in filtered_logs
                if log["task_id"] == task_id
            ]
        
        # Time range filters
        if "start_time" in filters:
            start_time = filters["start_time"]
            if isinstance(start_time, str):
                start_time = datetime.fromisoformat(start_time)
            filtered_logs = [
                log for log in filtered_logs
                if log["timestamp"] >= start_time
            ]
        
        if "end_time" in filters:
            end_time = filters["end_time"]
            if isinstance(end_time, str):
                end_time = datetime.fromisoformat(end_time)
            filtered_logs = [
                log for log in filtered_logs
                if log["timestamp"] <= end_time
            ]
        
        return filtered_logs
    
    def _matches_filters(
        self,
        log_entry: Dict[str, Any],
        filters: Dict[str, Any]
    ) -> bool:
        """Check if a log entry matches the given filters."""
        if not filters:
            return True
        
        # Level filter
        if "level" in filters and log_entry["level"] != filters["level"].upper():
            return False
        
        # Component filter
        if "component" in filters and log_entry["component"] != filters["component"]:
            return False
        
        # Task ID filter
        if "task_id" in filters and log_entry["task_id"] != filters["task_id"]:
            return False
        
        # Time range filters
        if "start_time" in filters:
            start_time = filters["start_time"]
            if isinstance(start_time, str):
                start_time = datetime.fromisoformat(start_time)
            if log_entry["timestamp"] < start_time:
                return False
        
        if "end_time" in filters:
            end_time = filters["end_time"]
            if isinstance(end_time, str):
                end_time = datetime.fromisoformat(end_time)
            if log_entry["timestamp"] > end_time:
                return False
        
        return True
    
    def _format_logs_as_csv(self, logs: List[Dict[str, Any]]) -> str:
        """Format logs as CSV."""
        if not logs:
            return "timestamp,level,component,task_id,message\n"
        
        lines = ["timestamp,level,component,task_id,message"]
        
        for log in logs:
            timestamp = log["timestamp"].isoformat() if isinstance(log["timestamp"], datetime) else str(log["timestamp"])
            level = log["level"]
            component = log["component"] or ""
            task_id = log["task_id"] or ""
            message = log["message"].replace('"', '""')  # Escape quotes
            
            lines.append(f'"{timestamp}","{level}","{component}","{task_id}","{message}"')
        
        return "\n".join(lines)
    
    def _format_logs_as_text(self, logs: List[Dict[str, Any]]) -> str:
        """Format logs as plain text."""
        if not logs:
            return ""
        
        lines = []
        
        for log in logs:
            timestamp = log["timestamp"].isoformat() if isinstance(log["timestamp"], datetime) else str(log["timestamp"])
            level = log["level"]
            component = f"[{log['component']}]" if log["component"] else ""
            task_id = f"(task:{log['task_id']})" if log["task_id"] else ""
            message = log["message"]
            
            line = f"{timestamp} {level} {component} {task_id} {message}".strip()
            lines.append(line)
        
        return "\n".join(lines)
    
    async def _broadcast_log_entry(self, agent_id: str, log_entry: AgentLogEntry):
        """Broadcast log entry via WebSocket."""
        log_data = {
            "type": "agent_log_entry",
            "agent_id": agent_id,
            "log_entry": {
                "timestamp": log_entry.timestamp.isoformat(),
                "level": log_entry.level,
                "message": log_entry.message,
                "component": log_entry.component,
                "task_id": log_entry.task_id,
                "metadata": log_entry.metadata,
            }
        }
        
        await notify_agents_update(log_data)
    
    async def _notify_stream_subscribers(self, agent_id: str, log_entry: AgentLogEntry):
        """Notify active stream subscribers of new log entry."""
        if agent_id not in self.stream_subscribers:
            return
        
        log_data = {
            "timestamp": log_entry.timestamp,
            "level": log_entry.level,
            "message": log_entry.message,
            "component": log_entry.component,
            "task_id": log_entry.task_id,
            "metadata": log_entry.metadata
        }
        
        # Check each subscriber's filters
        for stream_id in list(self.stream_subscribers[agent_id]):
            if stream_id in self.log_filters:
                filters = self.log_filters[stream_id]
                if self._matches_filters(log_data, filters):
                    # This would trigger the stream generator to yield the new log
                    pass
    
    async def _cleanup_old_logs(self):
        """Background task to clean up old logs."""
        while True:
            try:
                await asyncio.sleep(3600)  # Run every hour
                
                cutoff_time = datetime.utcnow() - timedelta(hours=self.log_retention_hours)
                
                for agent_id, buffer in self.log_buffers.items():
                    # Remove old logs
                    while buffer and buffer[0]["timestamp"] < cutoff_time:
                        buffer.popleft()
                
                # Clean up inactive streams
                inactive_streams = []
                for stream_id, config in self.active_streams.items():
                    if (datetime.utcnow() - config["last_activity"]).total_seconds() > 3600:
                        inactive_streams.append(stream_id)
                
                for stream_id in inactive_streams:
                    await self.close_log_stream(stream_id)
                
                logger.debug(f"Cleaned up {len(inactive_streams)} inactive log streams")
                
            except Exception as e:
                logger.error(f"Error in log cleanup task: {e}")
                await asyncio.sleep(300)  # Wait 5 minutes on error