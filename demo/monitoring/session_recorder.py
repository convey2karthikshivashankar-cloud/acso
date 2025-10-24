"""
Demo session recording and playback system.
Provides comprehensive recording, storage, and playback of demo sessions.
"""

import asyncio
import json
import gzip
import base64
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Iterator
from dataclasses import dataclass, asdict
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """Types of events that can be recorded."""
    SESSION_START = "session_start"
    SESSION_END = "session_end"
    SCENARIO_START = "scenario_start"
    SCENARIO_END = "scenario_end"
    AGENT_ACTION = "agent_action"
    USER_INTERACTION = "user_interaction"
    METRIC_COLLECTED = "metric_collected"
    ALERT_GENERATED = "alert_generated"
    PERFORMANCE_RECORDED = "performance_recorded"
    STATE_CHANGE = "state_change"
    ERROR_OCCURRED = "error_occurred"


class PlaybackSpeed(str, Enum):
    """Playback speed options."""
    QUARTER = "0.25x"
    HALF = "0.5x"
    NORMAL = "1x"
    DOUBLE = "2x"
    QUADRUPLE = "4x"
    MAX = "max"


@dataclass
class RecordedEvent:
    """Represents a recorded demo event."""
    event_id: str
    event_type: EventType
    timestamp: datetime
    session_id: str
    scenario_id: Optional[str]
    agent_id: Optional[str]
    user_id: Optional[str]
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for JSON serialization."""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'RecordedEvent':
        """Create event from dictionary."""
        data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        data['event_type'] = EventType(data['event_type'])
        return cls(**data)


@dataclass
class RecordingMetadata:
    """Metadata for a demo recording."""
    recording_id: str
    session_id: str
    title: str
    description: str
    created_by: str
    created_at: datetime
    duration_seconds: Optional[float]
    event_count: int
    scenarios: List[str]
    agents: List[str]
    tags: List[str]
    version: str = "1.0"

    def to_dict(self) -> Dict[str, Any]:
        """Convert metadata to dictionary."""
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat()
        return data


class RecordingStorage:
    """Handles storage and retrieval of demo recordings."""
    
    def __init__(self, storage_path: str = "demo/recordings"):
        self.storage_path = storage_path
        self.recordings_index: Dict[str, RecordingMetadata] = {}
        self.compressed_storage = True
        
    async def save_recording(self, recording_id: str, events: List[RecordedEvent],
                           metadata: RecordingMetadata) -> bool:
        """Save a recording to storage."""
        try:
            import os
            os.makedirs(self.storage_path, exist_ok=True)
            
            # Save events
            events_data = [event.to_dict() for event in events]
            events_json = json.dumps(events_data, indent=2)
            
            if self.compressed_storage:
                # Compress events data
                compressed_data = gzip.compress(events_json.encode('utf-8'))
                events_filename = f"{recording_id}_events.json.gz"
                
                with open(f"{self.storage_path}/{events_filename}", 'wb') as f:
                    f.write(compressed_data)
            else:
                events_filename = f"{recording_id}_events.json"
                with open(f"{self.storage_path}/{events_filename}", 'w') as f:
                    f.write(events_json)
            
            # Save metadata
            metadata_filename = f"{recording_id}_metadata.json"
            with open(f"{self.storage_path}/{metadata_filename}", 'w') as f:
                json.dump(metadata.to_dict(), f, indent=2)
            
            # Update index
            self.recordings_index[recording_id] = metadata
            
            logger.info(f"Recording saved: {recording_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving recording {recording_id}: {e}")
            return False
            
    async def load_recording(self, recording_id: str) -> Optional[tuple[List[RecordedEvent], RecordingMetadata]]:
        """Load a recording from storage."""
        try:
            # Load metadata
            metadata_filename = f"{self.storage_path}/{recording_id}_metadata.json"
            with open(metadata_filename, 'r') as f:
                metadata_data = json.load(f)
                metadata_data['created_at'] = datetime.fromisoformat(metadata_data['created_at'])
                metadata = RecordingMetadata(**metadata_data)
            
            # Load events
            if self.compressed_storage:
                events_filename = f"{self.storage_path}/{recording_id}_events.json.gz"
                with open(events_filename, 'rb') as f:
                    compressed_data = f.read()
                    events_json = gzip.decompress(compressed_data).decode('utf-8')
            else:
                events_filename = f"{self.storage_path}/{recording_id}_events.json"
                with open(events_filename, 'r') as f:
                    events_json = f.read()
            
            events_data = json.loads(events_json)
            events = [RecordedEvent.from_dict(event_data) for event_data in events_data]
            
            return events, metadata
            
        except Exception as e:
            logger.error(f"Error loading recording {recording_id}: {e}")
            return None
            
    async def list_recordings(self, limit: Optional[int] = None) -> List[RecordingMetadata]:
        """List available recordings."""
        recordings = list(self.recordings_index.values())
        recordings.sort(key=lambda r: r.created_at, reverse=True)
        
        if limit:
            recordings = recordings[:limit]
            
        return recordings
        
    async def delete_recording(self, recording_id: str) -> bool:
        """Delete a recording from storage."""
        try:
            import os
            
            # Delete files
            metadata_file = f"{self.storage_path}/{recording_id}_metadata.json"
            if os.path.exists(metadata_file):
                os.remove(metadata_file)
            
            events_file = f"{self.storage_path}/{recording_id}_events.json"
            if os.path.exists(events_file):
                os.remove(events_file)
                
            compressed_events_file = f"{self.storage_path}/{recording_id}_events.json.gz"
            if os.path.exists(compressed_events_file):
                os.remove(compressed_events_file)
            
            # Remove from index
            if recording_id in self.recordings_index:
                del self.recordings_index[recording_id]
            
            logger.info(f"Recording deleted: {recording_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting recording {recording_id}: {e}")
            return False


class RecordingPlayer:
    """Handles playback of demo recordings."""
    
    def __init__(self):
        self.active_playbacks: Dict[str, Dict[str, Any]] = {}
        self.playback_tasks: Dict[str, asyncio.Task] = {}
        
    async def start_playback(self, recording_id: str, events: List[RecordedEvent],
                           metadata: RecordingMetadata, speed: PlaybackSpeed = PlaybackSpeed.NORMAL,
                           start_from: Optional[datetime] = None,
                           end_at: Optional[datetime] = None) -> str:
        """Start playback of a recording."""
        playback_id = f"playback_{recording_id}_{datetime.utcnow().timestamp()}"
        
        # Filter events by time range if specified
        filtered_events = events
        if start_from or end_at:
            filtered_events = []
            for event in events:
                if start_from and event.timestamp < start_from:
                    continue
                if end_at and event.timestamp > end_at:
                    continue
                filtered_events.append(event)
        
        # Calculate speed multiplier
        speed_multipliers = {
            PlaybackSpeed.QUARTER: 0.25,
            PlaybackSpeed.HALF: 0.5,
            PlaybackSpeed.NORMAL: 1.0,
            PlaybackSpeed.DOUBLE: 2.0,
            PlaybackSpeed.QUADRUPLE: 4.0,
            PlaybackSpeed.MAX: 0.0  # No delay
        }
        
        speed_multiplier = speed_multipliers[speed]
        
        # Initialize playback state
        self.active_playbacks[playback_id] = {
            'recording_id': recording_id,
            'metadata': metadata,
            'events': filtered_events,
            'speed': speed,
            'speed_multiplier': speed_multiplier,
            'current_event_index': 0,
            'start_time': datetime.utcnow(),
            'paused': False,
            'completed': False,
            'callbacks': []
        }
        
        # Start playback task
        task = asyncio.create_task(self._playback_loop(playback_id))
        self.playback_tasks[playback_id] = task
        
        logger.info(f"Started playback: {playback_id} for recording {recording_id}")
        return playback_id
        
    async def pause_playback(self, playback_id: str):
        """Pause a playback."""
        if playback_id in self.active_playbacks:
            self.active_playbacks[playback_id]['paused'] = True
            logger.info(f"Paused playback: {playback_id}")
            
    async def resume_playback(self, playback_id: str):
        """Resume a paused playback."""
        if playback_id in self.active_playbacks:
            self.active_playbacks[playback_id]['paused'] = False
            logger.info(f"Resumed playback: {playback_id}")
            
    async def stop_playback(self, playback_id: str):
        """Stop a playback."""
        if playback_id in self.playback_tasks:
            self.playback_tasks[playback_id].cancel()
            del self.playback_tasks[playback_id]
            
        if playback_id in self.active_playbacks:
            del self.active_playbacks[playback_id]
            
        logger.info(f"Stopped playback: {playback_id}")
        
    async def seek_playback(self, playback_id: str, timestamp: datetime):
        """Seek to a specific timestamp in playback."""
        if playback_id not in self.active_playbacks:
            return
            
        playback = self.active_playbacks[playback_id]
        events = playback['events']
        
        # Find the event index closest to the timestamp
        for i, event in enumerate(events):
            if event.timestamp >= timestamp:
                playback['current_event_index'] = i
                break
        else:
            # If timestamp is after all events, set to end
            playback['current_event_index'] = len(events)
            
        logger.info(f"Seeked playback {playback_id} to {timestamp}")
        
    async def add_playback_callback(self, playback_id: str, callback):
        """Add a callback function to be called for each event during playback."""
        if playback_id in self.active_playbacks:
            self.active_playbacks[playback_id]['callbacks'].append(callback)
            
    async def _playback_loop(self, playback_id: str):
        """Main playback loop."""
        try:
            playback = self.active_playbacks[playback_id]
            events = playback['events']
            speed_multiplier = playback['speed_multiplier']
            
            if not events:
                playback['completed'] = True
                return
                
            # Get the first event timestamp as reference
            first_event_time = events[0].timestamp
            playback_start_time = datetime.utcnow()
            
            while playback['current_event_index'] < len(events):
                # Check if paused
                while playback.get('paused', False):
                    await asyncio.sleep(0.1)
                    
                current_event = events[playback['current_event_index']]
                
                # Calculate delay based on original timing and speed
                if speed_multiplier > 0 and playback['current_event_index'] > 0:
                    prev_event = events[playback['current_event_index'] - 1]
                    original_delay = (current_event.timestamp - prev_event.timestamp).total_seconds()
                    scaled_delay = original_delay / speed_multiplier
                    
                    if scaled_delay > 0:
                        await asyncio.sleep(scaled_delay)
                
                # Execute event callbacks
                for callback in playback['callbacks']:
                    try:
                        await callback(current_event, playback_id)
                    except Exception as e:
                        logger.error(f"Error in playback callback: {e}")
                
                playback['current_event_index'] += 1
                
            playback['completed'] = True
            logger.info(f"Completed playback: {playback_id}")
            
        except asyncio.CancelledError:
            logger.info(f"Playback cancelled: {playback_id}")
        except Exception as e:
            logger.error(f"Error in playback loop: {e}")
            
    def get_playback_status(self, playback_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a playback."""
        if playback_id not in self.active_playbacks:
            return None
            
        playback = self.active_playbacks[playback_id]
        events = playback['events']
        current_index = playback['current_event_index']
        
        progress = 0.0
        if events:
            progress = current_index / len(events)
            
        current_event = None
        if current_index < len(events):
            current_event = events[current_index].to_dict()
            
        return {
            'playback_id': playback_id,
            'recording_id': playback['recording_id'],
            'progress': progress,
            'current_event_index': current_index,
            'total_events': len(events),
            'current_event': current_event,
            'paused': playback.get('paused', False),
            'completed': playback.get('completed', False),
            'speed': playback['speed'],
            'start_time': playback['start_time'].isoformat()
        }


class EnhancedSessionRecorder:
    """Enhanced session recorder with advanced features."""
    
    def __init__(self):
        self.storage = RecordingStorage()
        self.player = RecordingPlayer()
        self.active_recordings: Dict[str, Dict[str, Any]] = {}
        self.event_filters: Dict[str, List[EventType]] = {}
        
    async def start_recording(self, session_id: str, title: str = None,
                            description: str = None, created_by: str = "system",
                            event_filter: List[EventType] = None) -> str:
        """Start an enhanced recording session."""
        recording_id = f"rec_{session_id}_{datetime.utcnow().timestamp()}"
        
        self.active_recordings[recording_id] = {
            'session_id': session_id,
            'recording_id': recording_id,
            'title': title or f"Demo Session {session_id}",
            'description': description or f"Recording of demo session {session_id}",
            'created_by': created_by,
            'created_at': datetime.utcnow(),
            'events': [],
            'scenarios': set(),
            'agents': set(),
            'tags': []
        }
        
        # Set event filter
        if event_filter:
            self.event_filters[recording_id] = event_filter
            
        logger.info(f"Started enhanced recording: {recording_id}")
        return recording_id
        
    async def record_event(self, recording_id: str, event_type: EventType,
                         data: Dict[str, Any], session_id: str = None,
                         scenario_id: str = None, agent_id: str = None,
                         user_id: str = None, metadata: Dict[str, Any] = None):
        """Record an event with enhanced metadata."""
        if recording_id not in self.active_recordings:
            return
            
        # Check event filter
        if recording_id in self.event_filters:
            if event_type not in self.event_filters[recording_id]:
                return
                
        recording = self.active_recordings[recording_id]
        
        event = RecordedEvent(
            event_id=f"evt_{len(recording['events'])}_{datetime.utcnow().timestamp()}",
            event_type=event_type,
            timestamp=datetime.utcnow(),
            session_id=session_id or recording['session_id'],
            scenario_id=scenario_id,
            agent_id=agent_id,
            user_id=user_id,
            data=data,
            metadata=metadata
        )
        
        recording['events'].append(event)
        
        # Update tracking sets
        if scenario_id:
            recording['scenarios'].add(scenario_id)
        if agent_id:
            recording['agents'].add(agent_id)
            
    async def stop_recording(self, recording_id: str, tags: List[str] = None) -> bool:
        """Stop recording and save to storage."""
        if recording_id not in self.active_recordings:
            return False
            
        recording = self.active_recordings[recording_id]
        
        # Calculate duration
        events = recording['events']
        duration = None
        if events:
            start_time = events[0].timestamp
            end_time = events[-1].timestamp
            duration = (end_time - start_time).total_seconds()
            
        # Create metadata
        metadata = RecordingMetadata(
            recording_id=recording_id,
            session_id=recording['session_id'],
            title=recording['title'],
            description=recording['description'],
            created_by=recording['created_by'],
            created_at=recording['created_at'],
            duration_seconds=duration,
            event_count=len(events),
            scenarios=list(recording['scenarios']),
            agents=list(recording['agents']),
            tags=tags or []
        )
        
        # Save to storage
        success = await self.storage.save_recording(recording_id, events, metadata)
        
        if success:
            del self.active_recordings[recording_id]
            if recording_id in self.event_filters:
                del self.event_filters[recording_id]
                
        return success
        
    async def get_recording_analysis(self, recording_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed analysis of a recording."""
        result = await self.storage.load_recording(recording_id)
        if not result:
            return None
            
        events, metadata = result
        
        # Analyze events
        event_types = {}
        agents_activity = {}
        scenarios_timeline = {}
        
        for event in events:
            # Count event types
            event_type = event.event_type
            if event_type not in event_types:
                event_types[event_type] = 0
            event_types[event_type] += 1
            
            # Track agent activity
            if event.agent_id:
                if event.agent_id not in agents_activity:
                    agents_activity[event.agent_id] = []
                agents_activity[event.agent_id].append({
                    'timestamp': event.timestamp.isoformat(),
                    'event_type': event_type,
                    'data': event.data
                })
                
            # Track scenario timeline
            if event.scenario_id:
                if event.scenario_id not in scenarios_timeline:
                    scenarios_timeline[event.scenario_id] = {
                        'start_time': event.timestamp,
                        'end_time': event.timestamp,
                        'events': []
                    }
                scenarios_timeline[event.scenario_id]['end_time'] = event.timestamp
                scenarios_timeline[event.scenario_id]['events'].append(event.to_dict())
                
        return {
            'metadata': metadata.to_dict(),
            'analysis': {
                'event_types': event_types,
                'agents_activity': agents_activity,
                'scenarios_timeline': {
                    k: {
                        'start_time': v['start_time'].isoformat(),
                        'end_time': v['end_time'].isoformat(),
                        'duration_seconds': (v['end_time'] - v['start_time']).total_seconds(),
                        'event_count': len(v['events'])
                    }
                    for k, v in scenarios_timeline.items()
                }
            }
        }
        
    async def export_recording(self, recording_id: str, format: str = "json") -> Optional[str]:
        """Export a recording in various formats."""
        result = await self.storage.load_recording(recording_id)
        if not result:
            return None
            
        events, metadata = result
        
        if format == "json":
            export_data = {
                'metadata': metadata.to_dict(),
                'events': [event.to_dict() for event in events]
            }
            return json.dumps(export_data, indent=2)
            
        elif format == "csv":
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write header
            writer.writerow([
                'event_id', 'event_type', 'timestamp', 'session_id',
                'scenario_id', 'agent_id', 'user_id', 'data'
            ])
            
            # Write events
            for event in events:
                writer.writerow([
                    event.event_id,
                    event.event_type,
                    event.timestamp.isoformat(),
                    event.session_id,
                    event.scenario_id or '',
                    event.agent_id or '',
                    event.user_id or '',
                    json.dumps(event.data)
                ])
                
            return output.getvalue()
            
        return None


# Global enhanced recorder instance
enhanced_recorder = EnhancedSessionRecorder()