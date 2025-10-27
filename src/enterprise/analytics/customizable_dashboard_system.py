"""
Customizable Dashboard System for ACSO Enterprise.
Drag-and-drop dashboard designer with real-time data visualization.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
import json
import uuid
from abc import ABC, abstractmethod
from collections import defaultdict, deque
import numpy as np
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

class WidgetType(str, Enum):
    """Types of dashboard widgets."""
    METRIC = "metric"
    CHART = "chart"
    TABLE = "table"
    TEXT = "text"
    IMAGE = "image"
    MAP = "map"
    GAUGE = "gauge"
    PROGRESS = "progress"
    ALERT = "alert"
    IFRAME = "iframe"

class ChartType(str, Enum):
    """Types of charts."""
    LINE = "line"
    BAR = "bar"
    PIE = "pie"
    AREA = "area"
    SCATTER = "scatter"
    HEATMAP = "heatmap"
    HISTOGRAM = "histogram"
    DONUT = "donut"

class DataSourceType(str, Enum):
    """Types of data sources."""
    API = "api"
    DATABASE = "database"
    FILE = "file"
    REAL_TIME = "real_time"
    STATIC = "static"
    CALCULATED = "calculated"

class RefreshInterval(str, Enum):
    """Data refresh intervals."""
    REAL_TIME = "real_time"
    EVERY_5_SECONDS = "5s"
    EVERY_30_SECONDS = "30s"
    EVERY_MINUTE = "1m"
    EVERY_5_MINUTES = "5m"
    EVERY_15_MINUTES = "15m"
    EVERY_HOUR = "1h"
    DAILY = "24h"
    MANUAL = "manual"@d
ataclass
class DataSource:
    """Data source configuration."""
    source_id: str
    name: str
    source_type: DataSourceType
    connection_config: Dict[str, Any]
    query: Optional[str] = None
    refresh_interval: RefreshInterval = RefreshInterval.EVERY_5_MINUTES
    cache_duration: int = 300  # seconds
    enabled: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class WidgetConfig:
    """Widget configuration."""
    widget_id: str
    widget_type: WidgetType
    title: str
    data_source_id: str
    position: Dict[str, int]  # x, y, width, height
    chart_type: Optional[ChartType] = None
    display_options: Dict[str, Any] = field(default_factory=dict)
    filters: Dict[str, Any] = field(default_factory=dict)
    refresh_interval: RefreshInterval = RefreshInterval.EVERY_5_MINUTES
    visible: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Dashboard:
    """Dashboard configuration."""
    dashboard_id: str
    name: str
    description: str
    owner_id: str
    widgets: List[WidgetConfig]
    layout: Dict[str, Any] = field(default_factory=dict)
    theme: str = "default"
    is_public: bool = False
    shared_with: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)

class BaseDataSource(ABC):
    """Base class for data sources."""
    
    def __init__(self, config: DataSource):
        self.config = config
        self.logger = logging.getLogger(f"{__name__}.{config.name}")
        self.cache = {}
        self.last_refresh = {}
    
    @abstractmethod
    async def fetch_data(self, query: Optional[str] = None) -> Dict[str, Any]:
        """Fetch data from the source."""
        pass
    
    async def get_cached_data(self, query: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get cached data if available and not expired."""
        cache_key = self._get_cache_key(query)
        
        if cache_key in self.cache:
            cached_data, timestamp = self.cache[cache_key]
            if (datetime.utcnow() - timestamp).total_seconds() < self.config.cache_duration:
                return cached_data
        
        return None
    
    async def refresh_data(self, query: Optional[str] = None) -> Dict[str, Any]:
        """Refresh data from source and update cache."""
        try:
            data = await self.fetch_data(query)
            cache_key = self._get_cache_key(query)
            self.cache[cache_key] = (data, datetime.utcnow())
            self.last_refresh[cache_key] = datetime.utcnow()
            return data
        except Exception as e:
            self.logger.error(f"Failed to refresh data: {e}")
            return {}
    
    def _get_cache_key(self, query: Optional[str] = None) -> str:
        """Generate cache key."""
        return f"{self.config.source_id}_{hash(query or '')}"

class APIDataSource(BaseDataSource):
    """API-based data source."""
    
    async def fetch_data(self, query: Optional[str] = None) -> Dict[str, Any]:
        """Fetch data from API."""
        try:
            import aiohttp
            
            url = self.config.connection_config.get('url')
            headers = self.config.connection_config.get('headers', {})
            params = self.config.connection_config.get('params', {})
            
            if query:
                params.update(json.loads(query))
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, params=params) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        raise Exception(f"API request failed: {response.status}")
        
        except Exception as e:
            self.logger.error(f"API data fetch failed: {e}")
            return {"error": str(e)}

class DatabaseDataSource(BaseDataSource):
    """Database-based data source."""
    
    async def fetch_data(self, query: Optional[str] = None) -> Dict[str, Any]:
        """Fetch data from database."""
        try:
            # This would integrate with actual database connections
            # For now, return sample data
            return {
                "data": [
                    {"timestamp": datetime.utcnow().isoformat(), "value": 100},
                    {"timestamp": (datetime.utcnow() - timedelta(minutes=5)).isoformat(), "value": 95}
                ],
                "columns": ["timestamp", "value"],
                "count": 2
            }
        except Exception as e:
            self.logger.error(f"Database data fetch failed: {e}")
            return {"error": str(e)}

class RealTimeDataSource(BaseDataSource):
    """Real-time data source."""
    
    def __init__(self, config: DataSource):
        super().__init__(config)
        self.subscribers = set()
        self.streaming_task = None
    
    async def fetch_data(self, query: Optional[str] = None) -> Dict[str, Any]:
        """Fetch real-time data."""
        try:
            # Generate sample real-time data
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "metrics": {
                    "cpu_usage": np.random.uniform(20, 80),
                    "memory_usage": np.random.uniform(30, 90),
                    "network_io": np.random.uniform(100, 1000)
                }
            }
        except Exception as e:
            self.logger.error(f"Real-time data fetch failed: {e}")
            return {"error": str(e)}
    
    async def subscribe(self, callback):
        """Subscribe to real-time updates."""
        self.subscribers.add(callback)
        if not self.streaming_task:
            self.streaming_task = asyncio.create_task(self._stream_data())
    
    async def unsubscribe(self, callback):
        """Unsubscribe from real-time updates."""
        self.subscribers.discard(callback)
        if not self.subscribers and self.streaming_task:
            self.streaming_task.cancel()
            self.streaming_task = None
    
    async def _stream_data(self):
        """Stream data to subscribers."""
        try:
            while self.subscribers:
                data = await self.fetch_data()
                for callback in self.subscribers.copy():
                    try:
                        await callback(data)
                    except Exception as e:
                        self.logger.error(f"Callback error: {e}")
                        self.subscribers.discard(callback)
                
                await asyncio.sleep(1)  # 1 second interval
        except asyncio.CancelledError:
            pass
        except Exception as e:
            self.logger.error(f"Streaming error: {e}")

class BaseWidget(ABC):
    """Base class for dashboard widgets."""
    
    def __init__(self, config: WidgetConfig, data_source: BaseDataSource):
        self.config = config
        self.data_source = data_source
        self.logger = logging.getLogger(f"{__name__}.{config.widget_id}")
        self.last_data = None
        self.subscribers = set()
    
    @abstractmethod
    async def render_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Render data for the widget."""
        pass
    
    async def get_widget_data(self) -> Dict[str, Any]:
        """Get processed data for the widget."""
        try:
            # Try to get cached data first
            raw_data = await self.data_source.get_cached_data(self.config.filters.get('query'))
            
            if raw_data is None:
                # Refresh data if not cached
                raw_data = await self.data_source.refresh_data(self.config.filters.get('query'))
            
            # Render data for this widget type
            rendered_data = await self.render_data(raw_data)
            
            self.last_data = rendered_data
            return rendered_data
            
        except Exception as e:
            self.logger.error(f"Failed to get widget data: {e}")
            return {"error": str(e)}
    
    async def subscribe_to_updates(self, callback):
        """Subscribe to widget data updates."""
        self.subscribers.add(callback)
        
        # If real-time data source, subscribe to it
        if isinstance(self.data_source, RealTimeDataSource):
            await self.data_source.subscribe(self._handle_real_time_update)
    
    async def unsubscribe_from_updates(self, callback):
        """Unsubscribe from widget data updates."""
        self.subscribers.discard(callback)
        
        if not self.subscribers and isinstance(self.data_source, RealTimeDataSource):
            await self.data_source.unsubscribe(self._handle_real_time_update)
    
    async def _handle_real_time_update(self, data: Dict[str, Any]):
        """Handle real-time data updates."""
        try:
            rendered_data = await self.render_data(data)
            self.last_data = rendered_data
            
            # Notify all subscribers
            for callback in self.subscribers.copy():
                try:
                    await callback(rendered_data)
                except Exception as e:
                    self.logger.error(f"Subscriber callback error: {e}")
                    self.subscribers.discard(callback)
        
        except Exception as e:
            self.logger.error(f"Real-time update handling failed: {e}")

class MetricWidget(BaseWidget):
    """Metric display widget."""
    
    async def render_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Render metric data."""
        try:
            if "error" in data:
                return data
            
            # Extract metric value based on configuration
            value_path = self.config.display_options.get('value_path', 'value')
            metric_value = self._extract_value(data, value_path)
            
            # Format the metric
            format_type = self.config.display_options.get('format', 'number')
            formatted_value = self._format_value(metric_value, format_type)
            
            # Calculate trend if historical data available
            trend = self._calculate_trend(data)
            
            return {
                "widget_type": "metric",
                "value": formatted_value,
                "raw_value": metric_value,
                "trend": trend,
                "unit": self.config.display_options.get('unit', ''),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {"error": f"Metric rendering failed: {e}"}
    
    def _extract_value(self, data: Dict[str, Any], path: str) -> float:
        """Extract value from data using dot notation path."""
        try:
            keys = path.split('.')
            value = data
            for key in keys:
                if isinstance(value, dict):
                    value = value.get(key)
                elif isinstance(value, list) and key.isdigit():
                    value = value[int(key)]
                else:
                    return 0.0
            
            return float(value) if value is not None else 0.0
        except:
            return 0.0
    
    def _format_value(self, value: float, format_type: str) -> str:
        """Format value based on type."""
        try:
            if format_type == 'percentage':
                return f"{value:.1f}%"
            elif format_type == 'currency':
                return f"${value:,.2f}"
            elif format_type == 'integer':
                return f"{int(value):,}"
            elif format_type == 'decimal':
                return f"{value:.2f}"
            else:
                return str(value)
        except:
            return str(value)
    
    def _calculate_trend(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Calculate trend from historical data."""
        try:
            if 'historical' in data and len(data['historical']) >= 2:
                values = [float(item.get('value', 0)) for item in data['historical']]
                if len(values) >= 2:
                    current = values[-1]
                    previous = values[-2]
                    change = current - previous
                    change_pct = (change / previous * 100) if previous != 0 else 0
                    
                    return {
                        "direction": "up" if change > 0 else "down" if change < 0 else "flat",
                        "change": change,
                        "change_percentage": change_pct
                    }
            return None
        except:
            return None

class ChartWidget(BaseWidget):
    """Chart display widget."""
    
    async def render_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Render chart data."""
        try:
            if "error" in data:
                return data
            
            chart_type = self.config.chart_type or ChartType.LINE
            
            # Process data based on chart type
            if chart_type == ChartType.LINE:
                chart_data = self._process_line_chart_data(data)
            elif chart_type == ChartType.BAR:
                chart_data = self._process_bar_chart_data(data)
            elif chart_type == ChartType.PIE:
                chart_data = self._process_pie_chart_data(data)
            else:
                chart_data = self._process_generic_chart_data(data)
            
            return {
                "widget_type": "chart",
                "chart_type": chart_type.value,
                "data": chart_data,
                "options": self.config.display_options,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {"error": f"Chart rendering failed: {e}"}
    
    def _process_line_chart_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process data for line chart."""
        try:
            if 'data' in data and isinstance(data['data'], list):
                x_values = []
                y_values = []
                
                x_field = self.config.display_options.get('x_field', 'timestamp')
                y_field = self.config.display_options.get('y_field', 'value')
                
                for item in data['data']:
                    if isinstance(item, dict):
                        x_values.append(item.get(x_field))
                        y_values.append(item.get(y_field, 0))
                
                return {
                    "labels": x_values,
                    "datasets": [{
                        "label": self.config.title,
                        "data": y_values,
                        "borderColor": self.config.display_options.get('color', '#007bff'),
                        "fill": False
                    }]
                }
            
            return {"labels": [], "datasets": []}
        except:
            return {"labels": [], "datasets": []}
    
    def _process_bar_chart_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process data for bar chart."""
        try:
            if 'data' in data and isinstance(data['data'], list):
                labels = []
                values = []
                
                label_field = self.config.display_options.get('label_field', 'label')
                value_field = self.config.display_options.get('value_field', 'value')
                
                for item in data['data']:
                    if isinstance(item, dict):
                        labels.append(item.get(label_field, ''))
                        values.append(item.get(value_field, 0))
                
                return {
                    "labels": labels,
                    "datasets": [{
                        "label": self.config.title,
                        "data": values,
                        "backgroundColor": self.config.display_options.get('colors', ['#007bff'] * len(values))
                    }]
                }
            
            return {"labels": [], "datasets": []}
        except:
            return {"labels": [], "datasets": []}
    
    def _process_pie_chart_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process data for pie chart."""
        try:
            if 'data' in data and isinstance(data['data'], list):
                labels = []
                values = []
                
                label_field = self.config.display_options.get('label_field', 'label')
                value_field = self.config.display_options.get('value_field', 'value')
                
                for item in data['data']:
                    if isinstance(item, dict):
                        labels.append(item.get(label_field, ''))
                        values.append(item.get(value_field, 0))
                
                return {
                    "labels": labels,
                    "datasets": [{
                        "data": values,
                        "backgroundColor": self.config.display_options.get('colors', [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
                        ])
                    }]
                }
            
            return {"labels": [], "datasets": []}
        except:
            return {"labels": [], "datasets": []}
    
    def _process_generic_chart_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process data for generic chart types."""
        return data.get('data', {})

class TableWidget(BaseWidget):
    """Table display widget."""
    
    async def render_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Render table data."""
        try:
            if "error" in data:
                return data
            
            # Extract table data
            if 'data' in data and isinstance(data['data'], list):
                table_data = data['data']
                columns = data.get('columns', [])
                
                # If no columns specified, infer from first row
                if not columns and table_data:
                    first_row = table_data[0]
                    if isinstance(first_row, dict):
                        columns = list(first_row.keys())
                
                # Apply column configuration
                column_config = self.config.display_options.get('columns', {})
                formatted_columns = []
                
                for col in columns:
                    col_info = column_config.get(col, {})
                    formatted_columns.append({
                        "key": col,
                        "title": col_info.get('title', col.replace('_', ' ').title()),
                        "type": col_info.get('type', 'text'),
                        "sortable": col_info.get('sortable', True),
                        "width": col_info.get('width')
                    })
                
                # Apply pagination
                page_size = self.config.display_options.get('page_size', 50)
                page = self.config.filters.get('page', 1)
                start_idx = (page - 1) * page_size
                end_idx = start_idx + page_size
                
                paginated_data = table_data[start_idx:end_idx]
                
                return {
                    "widget_type": "table",
                    "columns": formatted_columns,
                    "data": paginated_data,
                    "pagination": {
                        "current_page": page,
                        "page_size": page_size,
                        "total_rows": len(table_data),
                        "total_pages": (len(table_data) + page_size - 1) // page_size
                    },
                    "timestamp": datetime.utcnow().isoformat()
                }
            
            return {
                "widget_type": "table",
                "columns": [],
                "data": [],
                "pagination": {"current_page": 1, "page_size": 50, "total_rows": 0, "total_pages": 0}
            }
            
        except Exception as e:
            return {"error": f"Table rendering failed: {e}"}

class DashboardEngine:
    """Core dashboard engine."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.dashboards: Dict[str, Dashboard] = {}
        self.data_sources: Dict[str, BaseDataSource] = {}
        self.widgets: Dict[str, BaseWidget] = {}
        self.widget_classes = {
            WidgetType.METRIC: MetricWidget,
            WidgetType.CHART: ChartWidget,
            WidgetType.TABLE: TableWidget
        }
        self.data_source_classes = {
            DataSourceType.API: APIDataSource,
            DataSourceType.DATABASE: DatabaseDataSource,
            DataSourceType.REAL_TIME: RealTimeDataSource
        }
        
        # Background tasks
        self.refresh_tasks: Dict[str, asyncio.Task] = {}
        self.system_active = False
    
    async def initialize(self) -> None:
        """Initialize the dashboard engine."""
        try:
            self.logger.info("Initializing Dashboard Engine")
            self.system_active = True
            self.logger.info("Dashboard Engine initialized successfully")
        except Exception as e:
            self.logger.error(f"Failed to initialize dashboard engine: {e}")
            raise
    
    async def shutdown(self) -> None:
        """Shutdown the dashboard engine."""
        try:
            self.logger.info("Shutting down Dashboard Engine")
            self.system_active = False
            
            # Cancel refresh tasks
            for task in self.refresh_tasks.values():
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
            
            # Cleanup real-time data sources
            for data_source in self.data_sources.values():
                if isinstance(data_source, RealTimeDataSource):
                    if data_source.streaming_task:
                        data_source.streaming_task.cancel()
            
            self.logger.info("Dashboard Engine shutdown complete")
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
    
    async def create_data_source(self, config: DataSource) -> str:
        """Create a new data source."""
        try:
            source_class = self.data_source_classes.get(config.source_type)
            if not source_class:
                raise ValueError(f"Unsupported data source type: {config.source_type}")
            
            data_source = source_class(config)
            self.data_sources[config.source_id] = data_source
            
            self.logger.info(f"Created data source: {config.source_id}")
            return config.source_id
        except Exception as e:
            self.logger.error(f"Failed to create data source: {e}")
            raise
    
    async def create_dashboard(self, dashboard: Dashboard) -> str:
        """Create a new dashboard."""
        try:
            # Validate widgets have valid data sources
            for widget_config in dashboard.widgets:
                if widget_config.data_source_id not in self.data_sources:
                    raise ValueError(f"Data source not found: {widget_config.data_source_id}")
            
            # Create widget instances
            for widget_config in dashboard.widgets:
                await self._create_widget(widget_config)
            
            # Store dashboard
            self.dashboards[dashboard.dashboard_id] = dashboard
            
            self.logger.info(f"Created dashboard: {dashboard.dashboard_id}")
            return dashboard.dashboard_id
        except Exception as e:
            self.logger.error(f"Failed to create dashboard: {e}")
            raise
    
    async def _create_widget(self, config: WidgetConfig) -> str:
        """Create a widget instance."""
        try:
            widget_class = self.widget_classes.get(config.widget_type)
            if not widget_class:
                raise ValueError(f"Unsupported widget type: {config.widget_type}")
            
            data_source = self.data_sources[config.data_source_id]
            widget = widget_class(config, data_source)
            
            self.widgets[config.widget_id] = widget
            
            # Start refresh task if needed
            if config.refresh_interval != RefreshInterval.MANUAL:
                await self._start_widget_refresh_task(config.widget_id)
            
            return config.widget_id
        except Exception as e:
            self.logger.error(f"Failed to create widget: {e}")
            raise
    
    async def _start_widget_refresh_task(self, widget_id: str):
        """Start background refresh task for a widget."""
        try:
            widget = self.widgets[widget_id]
            interval_seconds = self._get_refresh_interval_seconds(widget.config.refresh_interval)
            
            if interval_seconds > 0:
                task = asyncio.create_task(self._widget_refresh_loop(widget_id, interval_seconds))
                self.refresh_tasks[widget_id] = task
        except Exception as e:
            self.logger.error(f"Failed to start refresh task for widget {widget_id}: {e}")
    
    def _get_refresh_interval_seconds(self, interval: RefreshInterval) -> int:
        """Convert refresh interval to seconds."""
        interval_map = {
            RefreshInterval.EVERY_5_SECONDS: 5,
            RefreshInterval.EVERY_30_SECONDS: 30,
            RefreshInterval.EVERY_MINUTE: 60,
            RefreshInterval.EVERY_5_MINUTES: 300,
            RefreshInterval.EVERY_15_MINUTES: 900,
            RefreshInterval.EVERY_HOUR: 3600,
            RefreshInterval.DAILY: 86400,
            RefreshInterval.MANUAL: 0,
            RefreshInterval.REAL_TIME: 1
        }
        return interval_map.get(interval, 300)
    
    async def _widget_refresh_loop(self, widget_id: str, interval_seconds: int):
        """Background refresh loop for a widget."""
        try:
            while self.system_active and widget_id in self.widgets:
                widget = self.widgets[widget_id]
                try:
                    await widget.get_widget_data()
                except Exception as e:
                    self.logger.error(f"Widget refresh failed for {widget_id}: {e}")
                
                await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            self.logger.error(f"Widget refresh loop error for {widget_id}: {e}")
    
    async def get_dashboard_data(self, dashboard_id: str) -> Dict[str, Any]:
        """Get complete dashboard data."""
        try:
            dashboard = self.dashboards.get(dashboard_id)
            if not dashboard:
                return {"error": "Dashboard not found"}
            
            widget_data = {}
            for widget_config in dashboard.widgets:
                if widget_config.visible:
                    widget = self.widgets.get(widget_config.widget_id)
                    if widget:
                        widget_data[widget_config.widget_id] = await widget.get_widget_data()
            
            return {
                "dashboard_id": dashboard_id,
                "name": dashboard.name,
                "description": dashboard.description,
                "layout": dashboard.layout,
                "theme": dashboard.theme,
                "widgets": widget_data,
                "last_updated": datetime.utcnow().isoformat()
            }
        except Exception as e:
            self.logger.error(f"Failed to get dashboard data: {e}")
            return {"error": str(e)}
    
    async def get_widget_data(self, widget_id: str) -> Dict[str, Any]:
        """Get data for a specific widget."""
        try:
            widget = self.widgets.get(widget_id)
            if not widget:
                return {"error": "Widget not found"}
            
            return await widget.get_widget_data()
        except Exception as e:
            self.logger.error(f"Failed to get widget data: {e}")
            return {"error": str(e)}
    
    def list_dashboards(self, owner_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List available dashboards."""
        try:
            dashboards = []
            for dashboard in self.dashboards.values():
                if owner_id is None or dashboard.owner_id == owner_id or dashboard.is_public:
                    dashboards.append({
                        "dashboard_id": dashboard.dashboard_id,
                        "name": dashboard.name,
                        "description": dashboard.description,
                        "owner_id": dashboard.owner_id,
                        "is_public": dashboard.is_public,
                        "widget_count": len(dashboard.widgets),
                        "created_at": dashboard.created_at.isoformat(),
                        "updated_at": dashboard.updated_at.isoformat(),
                        "tags": dashboard.tags
                    })
            
            return dashboards
        except Exception as e:
            self.logger.error(f"Failed to list dashboards: {e}")
            return []
    
    def list_data_sources(self) -> List[Dict[str, Any]]:
        """List available data sources."""
        try:
            sources = []
            for source_id, data_source in self.data_sources.items():
                sources.append({
                    "source_id": source_id,
                    "name": data_source.config.name,
                    "source_type": data_source.config.source_type.value,
                    "refresh_interval": data_source.config.refresh_interval.value,
                    "enabled": data_source.config.enabled,
                    "last_refresh": data_source.last_refresh.get(source_id, {}).get(source_id)
                })
            
            return sources
        except Exception as e:
            self.logger.error(f"Failed to list data sources: {e}")
            return []