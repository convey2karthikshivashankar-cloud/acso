import React from 'react';
import {
  Box,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  DragIndicator,
  MoreVert,
  Fullscreen,
  FullscreenExit,
  Close,
  Refresh,
  Settings,
  Add,
} from '@mui/icons-material';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { useBreakpoints } from '../../hooks/useBreakpoints';

const ResponsiveGridLayout = WidthProvider(Responsive);

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  component?: React.ComponentType<any>;
  dataSource?: string;
  configuration?: Record<string, any>;
  props?: Record<string, any>;
  config?: {
    refreshInterval?: number;
    allowResize?: boolean;
    allowRemove?: boolean;
    allowFullscreen?: boolean;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  };
  layout?: {
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    static?: boolean;
  };
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description?: string;
  role?: string;
  isDefault?: boolean;
  tags?: string[];
  widgets: DashboardWidget[];
  layouts: Record<string, Layout[]>;
  settings?: {
    cols: Record<string, number>;
    rowHeight: number;
    margin: [number, number];
    containerPadding: [number, number];
    compactType: 'vertical' | 'horizontal' | null;
    preventCollision: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayoutEngineProps {
  widgets: DashboardWidget[];
  template?: DashboardTemplate;
  editable?: boolean;
  onLayoutChange?: (layouts: Record<string, Layout[]>) => void;
  onWidgetAdd?: (widget: Partial<DashboardWidget>) => void;
  onWidgetRemove?: (widgetId: string) => void;
  onWidgetUpdate?: (widgetId: string, updates: Partial<DashboardWidget>) => void;
  onTemplateChange?: (template: DashboardTemplate) => void;
  availableWidgets?: Array<{
    type: string;
    name: string;
    description: string;
    component: React.ComponentType<any>;
    defaultSize: { w: number; h: number };
  }>;
}

export const DashboardLayoutEngine: React.FC<DashboardLayoutEngineProps> = ({
  widgets,
  template,
  editable = false,
  onLayoutChange,
  onWidgetAdd,
  onWidgetRemove,
  onWidgetUpdate,
  onTemplateChange,
  availableWidgets = [],
}) => {
  const theme = useTheme();
  const { current: currentBreakpoint } = useBreakpoints();
  const [fullscreenWidget, setFullscreenWidget] = React.useState<string | null>(null);
  const [widgetMenus, setWidgetMenus] = React.useState<Record<string, HTMLElement | null>>({});
  const [addWidgetAnchor, setAddWidgetAnchor] = React.useState<HTMLElement | null>(null);

  // Default layout settings
  const defaultSettings = {
    cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
    rowHeight: 60,
    margin: [16, 16] as [number, number],
    containerPadding: [16, 16] as [number, number],
    compactType: 'vertical' as const,
    preventCollision: false,
  };

  const settings = template?.settings || defaultSettings;

  // Convert widgets to layouts for react-grid-layout
  const layouts = React.useMemo(() => {
    if (template?.layouts) {
      return template.layouts;
    }

    const layoutsByBreakpoint: Record<string, Layout[]> = {};
    Object.keys(settings.cols).forEach(breakpoint => {
      layoutsByBreakpoint[breakpoint] = widgets.map(widget => ({
        i: widget.id,
        x: widget.layout.x,
        y: widget.layout.y,
        w: widget.layout.w,
        h: widget.layout.h,
        minW: widget.layout.minW || widget.config?.minWidth || 2,
        minH: widget.layout.minH || widget.config?.minHeight || 2,
        maxW: widget.layout.maxW || widget.config?.maxWidth,
        maxH: widget.layout.maxH || widget.config?.maxHeight,
        static: widget.layout.static || !editable,
      }));
    });

    return layoutsByBreakpoint;
  }, [widgets, template, settings.cols, editable]);

  const handleLayoutChange = (currentLayout: Layout[], allLayouts: Record<string, Layout[]>) => {
    if (!editable) return;

    // Update widget layouts
    const updatedWidgets = widgets.map(widget => {
      const layoutItem = currentLayout.find(item => item.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          layout: {
            ...widget.layout,
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h,
          },
        };
      }
      return widget;
    });

    // Notify parent components
    onLayoutChange?.(allLayouts);
    
    if (template && onTemplateChange) {
      onTemplateChange({
        ...template,
        layouts: allLayouts,
        widgets: updatedWidgets,
      });
    }
  };

  const handleWidgetMenuOpen = (widgetId: string, event: React.MouseEvent<HTMLElement>) => {
    setWidgetMenus(prev => ({ ...prev, [widgetId]: event.currentTarget }));
  };

  const handleWidgetMenuClose = (widgetId: string) => {
    setWidgetMenus(prev => ({ ...prev, [widgetId]: null }));
  };

  const handleWidgetRefresh = (widgetId: string) => {
    // Trigger widget refresh
    const widget = widgets.find(w => w.id === widgetId);
    if (widget && onWidgetUpdate) {
      onWidgetUpdate(widgetId, { ...widget });
    }
    handleWidgetMenuClose(widgetId);
  };

  const handleWidgetFullscreen = (widgetId: string) => {
    setFullscreenWidget(fullscreenWidget === widgetId ? null : widgetId);
    handleWidgetMenuClose(widgetId);
  };

  const handleWidgetRemove = (widgetId: string) => {
    onWidgetRemove?.(widgetId);
    handleWidgetMenuClose(widgetId);
  };

  const handleAddWidget = (widgetType: string) => {
    const availableWidget = availableWidgets.find(w => w.type === widgetType);
    if (availableWidget && onWidgetAdd) {
      const newWidget: Partial<DashboardWidget> = {
        id: `widget-${Date.now()}`,
        type: widgetType,
        title: availableWidget.name,
        component: availableWidget.component,
        layout: {
          x: 0,
          y: 0,
          w: availableWidget.defaultSize.w,
          h: availableWidget.defaultSize.h,
        },
        config: {
          allowResize: true,
          allowRemove: true,
          allowFullscreen: true,
        },
      };
      onWidgetAdd(newWidget);
    }
    setAddWidgetAnchor(null);
  };

  const renderWidget = (widget: DashboardWidget) => {
    const isFullscreen = fullscreenWidget === widget.id;
    const WidgetComponent = widget.component;

    return (
      <Paper
        key={widget.id}
        elevation={2}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          ...(isFullscreen && {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: theme.zIndex.modal,
            margin: 0,
          }),
        }}
      >
        {/* Widget Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1,
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
            cursor: editable ? 'move' : 'default',
          }}
          className={editable ? 'drag-handle' : ''}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {editable && <DragIndicator sx={{ color: 'text.secondary', fontSize: 16 }} />}
            <Typography variant="subtitle2" fontWeight="medium" noWrap>
              {widget.title}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {widget.config?.allowFullscreen && (
              <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                <IconButton
                  size="small"
                  onClick={() => handleWidgetFullscreen(widget.id)}
                >
                  {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Widget Options">
              <IconButton
                size="small"
                onClick={(e) => handleWidgetMenuOpen(widget.id, e)}
              >
                <MoreVert />
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={widgetMenus[widget.id]}
              open={Boolean(widgetMenus[widget.id])}
              onClose={() => handleWidgetMenuClose(widget.id)}
            >
              <MenuItem onClick={() => handleWidgetRefresh(widget.id)}>
                <Refresh sx={{ mr: 1 }} />
                Refresh
              </MenuItem>
              <MenuItem onClick={() => handleWidgetFullscreen(widget.id)}>
                {isFullscreen ? <FullscreenExit sx={{ mr: 1 }} /> : <Fullscreen sx={{ mr: 1 }} />}
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </MenuItem>
              {widget.config?.allowRemove && editable && (
                <MenuItem 
                  onClick={() => handleWidgetRemove(widget.id)}
                  sx={{ color: 'error.main' }}
                >
                  <Close sx={{ mr: 1 }} />
                  Remove
                </MenuItem>
              )}
            </Menu>
          </Box>
        </Box>

        {/* Widget Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          <WidgetComponent {...(widget.props || {})} />
        </Box>
      </Paper>
    );
  };

  if (fullscreenWidget) {
    const widget = widgets.find(w => w.id === fullscreenWidget);
    return widget ? renderWidget(widget) : null;
  }

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      {/* Add Widget Button */}
      {editable && (
        <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}>
          <Tooltip title="Add Widget">
            <IconButton
              onClick={(e) => setAddWidgetAnchor(e.currentTarget)}
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
              }}
            >
              <Add />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={addWidgetAnchor}
            open={Boolean(addWidgetAnchor)}
            onClose={() => setAddWidgetAnchor(null)}
          >
            {availableWidgets.map((widget) => (
              <MenuItem
                key={widget.type}
                onClick={() => handleAddWidget(widget.type)}
              >
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {widget.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {widget.description}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Menu>
        </Box>
      )}

      {/* Dashboard Grid */}
      <ResponsiveGridLayout
        className="dashboard-layout"
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        cols={settings.cols}
        rowHeight={settings.rowHeight}
        margin={settings.margin}
        containerPadding={settings.containerPadding}
        compactType={settings.compactType}
        preventCollision={settings.preventCollision}
        isDraggable={editable}
        isResizable={editable}
        dragHandleClassName="drag-handle"
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      >
        {widgets.map(renderWidget)}
      </ResponsiveGridLayout>
    </Box>
  );
};