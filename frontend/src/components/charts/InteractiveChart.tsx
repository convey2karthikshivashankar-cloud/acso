import React from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  useTheme,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  FilterList,
  Link,
  Fullscreen,
  DrillDown,
  Compare,
  Bookmark,
  Share,
} from '@mui/icons-material';
import { BaseChart, BaseChartProps, ChartDataPoint } from './BaseChart';

export interface DrillDownLevel {
  id: string;
  name: string;
  dataKey: string;
  parentKey?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface ChartFilter {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'in';
  value: any;
  label: string;
  active: boolean;
}

export interface ChartLink {
  id: string;
  sourceChartId: string;
  targetChartId: string;
  type: 'filter' | 'highlight' | 'zoom' | 'selection';
  mapping: Record<string, string>;
}

export interface InteractionState {
  selectedDataPoints: ChartDataPoint[];
  hoveredDataPoint: ChartDataPoint | null;
  zoomLevel: number;
  zoomRange: { start: number; end: number } | null;
  activeFilters: ChartFilter[];
  drillDownPath: DrillDownLevel[];
  bookmarks: Array<{
    id: string;
    name: string;
    state: any;
    timestamp: Date;
  }>;
}

export interface InteractiveChartProps extends BaseChartProps {
  chartId: string;
  enableDrillDown?: boolean;
  enableCrossFilter?: boolean;
  enableZoom?: boolean;
  enableSelection?: boolean;
  enableBookmarks?: boolean;
  drillDownLevels?: DrillDownLevel[];
  availableFilters?: ChartFilter[];
  linkedCharts?: string[];
  onInteraction?: (type: string, data: any) => void;
  onDrillDown?: (level: DrillDownLevel, dataPoint: ChartDataPoint) => void;
  onFilter?: (filters: ChartFilter[]) => void;
  onSelection?: (selectedData: ChartDataPoint[]) => void;
  onZoom?: (range: { start: number; end: number } | null) => void;
  onBookmark?: (bookmark: any) => void;
  children: React.ReactNode;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  chartId,
  enableDrillDown = true,
  enableCrossFilter = true,
  enableZoom = true,
  enableSelection = true,
  enableBookmarks = true,
  drillDownLevels = [],
  availableFilters = [],
  linkedCharts = [],
  onInteraction,
  onDrillDown,
  onFilter,
  onSelection,
  onZoom,
  onBookmark,
  children,
  ...baseProps
}) => {
  const theme = useTheme();
  const [interactionState, setInteractionState] = React.useState<InteractionState>({
    selectedDataPoints: [],
    hoveredDataPoint: null,
    zoomLevel: 1,
    zoomRange: null,
    activeFilters: [],
    drillDownPath: [],
    bookmarks: [],
  });

  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [filterDialogOpen, setFilterDialogOpen] = React.useState(false);
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = React.useState(false);
  const [drillDownMenuAnchor, setDrillDownMenuAnchor] = React.useState<HTMLElement | null>(null);

  // Handle data point interactions
  const handleDataPointClick = React.useCallback((dataPoint: ChartDataPoint, event: React.MouseEvent) => {
    if (enableSelection) {
      setInteractionState(prev => {
        const isSelected = prev.selectedDataPoints.some(dp => dp.timestamp === dataPoint.timestamp);
        const newSelection = isSelected
          ? prev.selectedDataPoints.filter(dp => dp.timestamp !== dataPoint.timestamp)
          : event.ctrlKey || event.metaKey
          ? [...prev.selectedDataPoints, dataPoint]
          : [dataPoint];

        onSelection?.(newSelection);
        onInteraction?.('selection', { selected: newSelection, dataPoint });

        return { ...prev, selectedDataPoints: newSelection };
      });
    }
  }, [enableSelection, onSelection, onInteraction]);

  const handleDataPointHover = React.useCallback((dataPoint: ChartDataPoint | null) => {
    setInteractionState(prev => ({ ...prev, hoveredDataPoint: dataPoint }));
    onInteraction?.('hover', { dataPoint });
  }, [onInteraction]);

  // Drill-down functionality
  const handleDrillDown = (level: DrillDownLevel, dataPoint: ChartDataPoint) => {
    setInteractionState(prev => ({
      ...prev,
      drillDownPath: [...prev.drillDownPath, level],
    }));

    onDrillDown?.(level, dataPoint);
    onInteraction?.('drilldown', { level, dataPoint });
    setDrillDownMenuAnchor(null);
  };

  const handleDrillUp = () => {
    setInteractionState(prev => ({
      ...prev,
      drillDownPath: prev.drillDownPath.slice(0, -1),
    }));

    onInteraction?.('drillup', { path: interactionState.drillDownPath });
  };

  // Filtering functionality
  const handleFilterToggle = (filter: ChartFilter) => {
    setInteractionState(prev => {
      const newFilters = prev.activeFilters.map(f =>
        f.id === filter.id ? { ...f, active: !f.active } : f
      );

      onFilter?.(newFilters);
      onInteraction?.('filter', { filters: newFilters });

      return { ...prev, activeFilters: newFilters };
    });
  };

  const handleAddFilter = (filter: ChartFilter) => {
    setInteractionState(prev => {
      const newFilters = [...prev.activeFilters, { ...filter, active: true }];
      onFilter?.(newFilters);
      return { ...prev, activeFilters: newFilters };
    });
  };

  const handleRemoveFilter = (filterId: string) => {
    setInteractionState(prev => {
      const newFilters = prev.activeFilters.filter(f => f.id !== filterId);
      onFilter?.(newFilters);
      return { ...prev, activeFilters: newFilters };
    });
  };

  // Zoom functionality
  const handleZoomIn = () => {
    const newZoomLevel = Math.min(interactionState.zoomLevel * 1.5, 5);
    setInteractionState(prev => ({ ...prev, zoomLevel: newZoomLevel }));
    onInteraction?.('zoom', { level: newZoomLevel });
  };

  const handleZoomOut = () => {
    const newZoomLevel = Math.max(interactionState.zoomLevel / 1.5, 0.5);
    setInteractionState(prev => ({ ...prev, zoomLevel: newZoomLevel }));
    onInteraction?.('zoom', { level: newZoomLevel });
  };

  const handleZoomToRange = (start: number, end: number) => {
    const range = { start, end };
    setInteractionState(prev => ({ ...prev, zoomRange: range }));
    onZoom?.(range);
    onInteraction?.('zoom_range', { range });
  };

  const handleResetZoom = () => {
    setInteractionState(prev => ({ ...prev, zoomLevel: 1, zoomRange: null }));
    onZoom?.(null);
    onInteraction?.('zoom_reset', {});
  };

  // Bookmark functionality
  const handleCreateBookmark = (name: string) => {
    const bookmark = {
      id: `bookmark-${Date.now()}`,
      name,
      state: {
        selectedDataPoints: interactionState.selectedDataPoints,
        zoomLevel: interactionState.zoomLevel,
        zoomRange: interactionState.zoomRange,
        activeFilters: interactionState.activeFilters,
        drillDownPath: interactionState.drillDownPath,
      },
      timestamp: new Date(),
    };

    setInteractionState(prev => ({
      ...prev,
      bookmarks: [...prev.bookmarks, bookmark],
    }));

    onBookmark?.(bookmark);
    setBookmarkDialogOpen(false);
  };

  const handleLoadBookmark = (bookmark: any) => {
    setInteractionState(prev => ({
      ...prev,
      ...bookmark.state,
    }));

    onInteraction?.('bookmark_load', { bookmark });
  };

  // Render interaction controls
  const renderControls = () => (
    <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {enableZoom && (
          <>
            <Tooltip title="Zoom In">
              <IconButton size="small" onClick={handleZoomIn}>
                <ZoomIn />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom Out">
              <IconButton size="small" onClick={handleZoomOut}>
                <ZoomOut />
              </IconButton>
            </Tooltip>
          </>
        )}

        {enableCrossFilter && (
          <Tooltip title="Filters">
            <IconButton size="small" onClick={() => setFilterDialogOpen(true)}>
              <FilterList />
            </IconButton>
          </Tooltip>
        )}

        {enableDrillDown && drillDownLevels.length > 0 && (
          <Tooltip title="Drill Down">
            <IconButton
              size="small"
              onClick={(e) => setDrillDownMenuAnchor(e.currentTarget)}
            >
              <DrillDown />
            </IconButton>
          </Tooltip>
        )}

        {enableBookmarks && (
          <Tooltip title="Bookmarks">
            <IconButton size="small" onClick={() => setBookmarkDialogOpen(true)}>
              <Bookmark />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="More Options">
          <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <Share />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  // Render active filters
  const renderActiveFilters = () => {
    if (interactionState.activeFilters.length === 0) return null;

    return (
      <Box sx={{ p: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {interactionState.activeFilters.map(filter => (
          <Chip
            key={filter.id}
            label={filter.label}
            onDelete={() => handleRemoveFilter(filter.id)}
            color={filter.active ? 'primary' : 'default'}
            size="small"
          />
        ))}
      </Box>
    );
  };

  // Render drill-down path
  const renderDrillDownPath = () => {
    if (interactionState.drillDownPath.length === 0) return null;

    return (
      <Box sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Path:
        </Typography>
        {interactionState.drillDownPath.map((level, index) => (
          <React.Fragment key={level.id}>
            <Chip
              label={level.name}
              size="small"
              onClick={() => {
                // Navigate to this level
                setInteractionState(prev => ({
                  ...prev,
                  drillDownPath: prev.drillDownPath.slice(0, index + 1),
                }));
              }}
            />
            {index < interactionState.drillDownPath.length - 1 && (
              <Typography variant="caption" color="text.secondary">
                →
              </Typography>
            )}
          </React.Fragment>
        ))}
        <Button size="small" onClick={handleDrillUp}>
          Up
        </Button>
      </Box>
    );
  };

  // Render selection info
  const renderSelectionInfo = () => {
    if (interactionState.selectedDataPoints.length === 0) return null;

    return (
      <Box sx={{ p: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Selected: {interactionState.selectedDataPoints.length} data points
        </Typography>
      </Box>
    );
  };

  // Render dialogs
  const renderFilterDialog = () => (
    <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Chart Filters</DialogTitle>
      <DialogContent>
        <List>
          {availableFilters.map(filter => (
            <ListItem
              key={filter.id}
              button
              onClick={() => handleFilterToggle(filter)}
            >
              <ListItemText
                primary={filter.label}
                secondary={`${filter.field} ${filter.operator} ${filter.value}`}
              />
              <Chip
                label={filter.active ? 'Active' : 'Inactive'}
                color={filter.active ? 'primary' : 'default'}
                size="small"
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setFilterDialogOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  const renderBookmarkDialog = () => (
    <Dialog open={bookmarkDialogOpen} onClose={() => setBookmarkDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Bookmarks</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Button
            variant="contained"
            onClick={() => {
              const name = prompt('Bookmark name:');
              if (name) handleCreateBookmark(name);
            }}
          >
            Create Bookmark
          </Button>
        </Box>
        
        <List>
          {interactionState.bookmarks.map(bookmark => (
            <ListItem key={bookmark.id}>
              <ListItemText
                primary={bookmark.name}
                secondary={bookmark.timestamp.toLocaleString()}
              />
              <Button onClick={() => handleLoadBookmark(bookmark)}>
                Load
              </Button>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setBookmarkDialogOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  // Render drill-down menu
  const renderDrillDownMenu = () => (
    <Menu
      anchorEl={drillDownMenuAnchor}
      open={Boolean(drillDownMenuAnchor)}
      onClose={() => setDrillDownMenuAnchor(null)}
    >
      {drillDownLevels.map(level => (
        <MenuItem
          key={level.id}
          onClick={() => {
            if (interactionState.selectedDataPoints.length > 0) {
              handleDrillDown(level, interactionState.selectedDataPoints[0]);
            }
          }}
          disabled={interactionState.selectedDataPoints.length === 0}
        >
          {level.name}
        </MenuItem>
      ))}
    </Menu>
  );

  return (
    <Box sx={{ position: 'relative' }}>
      {renderControls()}
      
      <BaseChart {...baseProps}>
        <Box
          sx={{
            width: '100%',
            height: '100%',
            transform: `scale(${interactionState.zoomLevel})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-in-out',
          }}
        >
          {React.cloneElement(children as React.ReactElement, {
            onDataPointClick: handleDataPointClick,
            onDataPointHover: handleDataPointHover,
            selectedDataPoints: interactionState.selectedDataPoints,
            hoveredDataPoint: interactionState.hoveredDataPoint,
            zoomRange: interactionState.zoomRange,
            activeFilters: interactionState.activeFilters,
          })}
        </Box>
      </BaseChart>

      {renderActiveFilters()}
      {renderDrillDownPath()}
      {renderSelectionInfo()}
      {renderFilterDialog()}
      {renderBookmarkDialog()}
      {renderDrillDownMenu()}
    </Box>
  );
};

export default InteractiveChart;