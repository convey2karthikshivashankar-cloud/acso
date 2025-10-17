import React from 'react';
import {
  Box,
  Typography,
  Button,
  Toolbar,
  AppBar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
} from '@mui/material';
import {
  Edit,
  Save,
  Undo,
  Settings,
  ViewModule,
  Dashboard as DashboardIcon,
  Add,
} from '@mui/icons-material';
import { DashboardLayoutEngine, DashboardWidget, DashboardTemplate } from './DashboardLayoutEngine';
import { DashboardTemplates } from './DashboardTemplates';
import WidgetContainer from './WidgetContainer';
import {
  MetricWidget,
  SystemHealthWidget,
  ActivityFeedWidget,
  ChartWidget,
  AgentStatusWidget,
  PerformanceMetricsWidget,
} from './widgets/SampleWidgets';

// Sample widget definitions
const availableWidgets = [
  {
    type: 'metric',
    name: 'Metric Widget',
    description: 'Display key performance indicators',
    component: MetricWidget,
    defaultSize: { w: 3, h: 3 },
  },
  {
    type: 'system-health',
    name: 'System Health',
    description: 'Monitor system resource usage',
    component: SystemHealthWidget,
    defaultSize: { w: 4, h: 4 },
  },
  {
    type: 'activity-feed',
    name: 'Activity Feed',
    description: 'Recent system activities and events',
    component: ActivityFeedWidget,
    defaultSize: { w: 4, h: 5 },
  },
  {
    type: 'chart',
    name: 'Chart Widget',
    description: 'Data visualization charts',
    component: ChartWidget,
    defaultSize: { w: 6, h: 4 },
  },
  {
    type: 'agent-status',
    name: 'Agent Status',
    description: 'Monitor ACSO agent health',
    component: AgentStatusWidget,
    defaultSize: { w: 4, h: 3 },
  },
  {
    type: 'performance',
    name: 'Performance Metrics',
    description: 'System performance indicators',
    component: PerformanceMetricsWidget,
    defaultSize: { w: 4, h: 3 },
  },
];

// Sample dashboard templates
const sampleTemplates: DashboardTemplate[] = [
  {
    id: 'admin-overview',
    name: 'Administrator Overview',
    description: 'Comprehensive system monitoring for administrators',
    role: 'admin',
    widgets: [
      {
        id: 'system-health-1',
        type: 'system-health',
        title: 'System Health',
        component: SystemHealthWidget,
        layout: { x: 0, y: 0, w: 4, h: 4 },
        config: { allowResize: true, allowRemove: true, refreshInterval: 30 },
      },
      {
        id: 'performance-1',
        type: 'performance',
        title: 'Performance Metrics',
        component: PerformanceMetricsWidget,
        layout: { x: 4, y: 0, w: 4, h: 3 },
        config: { allowResize: true, allowRemove: true, refreshInterval: 60 },
      },
      {
        id: 'agent-status-1',
        type: 'agent-status',
        title: 'Agent Status',
        component: AgentStatusWidget,
        layout: { x: 8, y: 0, w: 4, h: 3 },
        config: { allowResize: true, allowRemove: true, refreshInterval: 15 },
      },
      {
        id: 'activity-feed-1',
        type: 'activity-feed',
        title: 'Recent Activity',
        component: ActivityFeedWidget,
        layout: { x: 0, y: 4, w: 6, h: 5 },
        config: { allowResize: true, allowRemove: true, refreshInterval: 10 },
      },
      {
        id: 'chart-1',
        type: 'chart',
        title: 'System Metrics',
        component: ChartWidget,
        props: { type: 'line', title: 'System Metrics' },
        layout: { x: 6, y: 3, w: 6, h: 4 },
        config: { allowResize: true, allowRemove: true, refreshInterval: 30 },
      },
    ],
    layouts: {},
    settings: {
      cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
      rowHeight: 60,
      margin: [16, 16],
      containerPadding: [16, 16],
      compactType: 'vertical',
      preventCollision: false,
    },
  },
  {
    id: 'security-analyst',
    name: 'Security Analyst Dashboard',
    description: 'Security-focused monitoring and incident tracking',
    role: 'security',
    widgets: [
      {
        id: 'security-metrics-1',
        type: 'metric',
        title: 'Security Incidents',
        component: MetricWidget,
        props: { title: 'Active Incidents', value: 3, change: -25, changeType: 'decrease' },
        layout: { x: 0, y: 0, w: 3, h: 3 },
        config: { allowResize: true, allowRemove: true, refreshInterval: 30 },
      },
      {
        id: 'threat-chart-1',
        type: 'chart',
        title: 'Threat Detection',
        component: ChartWidget,
        props: { type: 'area', title: 'Threat Detection Over Time' },
        layout: { x: 3, y: 0, w: 6, h: 4 },
        config: { allowResize: true, allowRemove: true, refreshInterval: 60 },
      },
      {
        id: 'agent-status-2',
        type: 'agent-status',
        title: 'Security Agents',
        component: AgentStatusWidget,
        layout: { x: 9, y: 0, w: 3, h: 4 },
        config: { allowResize: true, allowRemove: true, refreshInterval: 15 },
      },
    ],
    layouts: {},
    settings: {
      cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
      rowHeight: 60,
      margin: [16, 16],
      containerPadding: [16, 16],
      compactType: 'vertical',
      preventCollision: false,
    },
  },
];

export const DashboardExample: React.FC = () => {
  const [currentTemplate, setCurrentTemplate] = React.useState<DashboardTemplate>(sampleTemplates[0]);
  const [widgets, setWidgets] = React.useState<DashboardWidget[]>(sampleTemplates[0].widgets);
  const [isEditing, setIsEditing] = React.useState(false);
  const [showTemplates, setShowTemplates] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);

  const handleTemplateSelect = (template: DashboardTemplate) => {
    setCurrentTemplate(template);
    setWidgets(template.widgets);
    setShowTemplates(false);
    setIsEditing(false);
  };

  const handleLayoutChange = (layouts: Record<string, any>) => {
    // Update the current template with new layouts
    setCurrentTemplate(prev => ({
      ...prev,
      layouts,
    }));
  };

  const handleWidgetAdd = (widget: Partial<DashboardWidget>) => {
    const newWidget: DashboardWidget = {
      id: widget.id || `widget-${Date.now()}`,
      type: widget.type || 'metric',
      title: widget.title || 'New Widget',
      component: widget.component || MetricWidget,
      props: widget.props || {},
      layout: widget.layout || { x: 0, y: 0, w: 4, h: 3 },
      config: {
        allowResize: true,
        allowRemove: true,
        allowFullscreen: true,
        refreshInterval: 60,
        ...widget.config,
      },
    };

    setWidgets(prev => [...prev, newWidget]);
  };

  const handleWidgetRemove = (widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
  };

  const handleWidgetUpdate = (widgetId: string, updates: Partial<DashboardWidget>) => {
    setWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, ...updates } : w));
  };

  const handleSaveDashboard = () => {
    // Save current dashboard state
    console.log('Saving dashboard:', { currentTemplate, widgets });
    setIsEditing(false);
  };

  const handleResetDashboard = () => {
    // Reset to original template
    setWidgets(currentTemplate.widgets);
    setIsEditing(false);
  };

  const renderDashboardToolbar = () => (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <DashboardIcon sx={{ mr: 2 }} />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {currentTemplate.name}
        </Typography>

        <Chip
          label={currentTemplate.role || 'Public'}
          color="primary"
          size="small"
          sx={{ mr: 2 }}
        />

        <Button
          startIcon={<ViewModule />}
          onClick={() => setShowTemplates(true)}
          sx={{ mr: 1 }}
        >
          Templates
        </Button>

        <FormControlLabel
          control={
            <Switch
              checked={isEditing}
              onChange={(e) => setIsEditing(e.target.checked)}
            />
          }
          label="Edit Mode"
          sx={{ mr: 2 }}
        />

        {isEditing && (
          <>
            <Button
              startIcon={<Save />}
              onClick={handleSaveDashboard}
              variant="contained"
              sx={{ mr: 1 }}
            >
              Save
            </Button>
            <Button
              startIcon={<Undo />}
              onClick={handleResetDashboard}
              sx={{ mr: 1 }}
            >
              Reset
            </Button>
          </>
        )}

        <IconButton
          onClick={(e) => setMenuAnchor(e.currentTarget)}
        >
          <Settings />
        </IconButton>

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem onClick={() => setSettingsOpen(true)}>
            <Settings sx={{ mr: 1 }} />
            Dashboard Settings
          </MenuItem>
          <MenuItem onClick={() => setShowTemplates(true)}>
            <ViewModule sx={{ mr: 1 }} />
            Manage Templates
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );

  if (showTemplates) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {renderDashboardToolbar()}
        <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
          <DashboardTemplates
            templates={sampleTemplates}
            currentTemplate={currentTemplate}
            onTemplateSelect={handleTemplateSelect}
            onTemplateCreate={(template) => {
              console.log('Create template:', template);
            }}
            onTemplateUpdate={(id, updates) => {
              console.log('Update template:', id, updates);
            }}
            onTemplateDelete={(id) => {
              console.log('Delete template:', id);
            }}
            onTemplateDuplicate={(id) => {
              console.log('Duplicate template:', id);
            }}
            onTemplateShare={(id) => {
              console.log('Share template:', id);
            }}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {renderDashboardToolbar()}
      
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <DashboardLayoutEngine
          widgets={widgets}
          template={currentTemplate}
          editable={isEditing}
          onLayoutChange={handleLayoutChange}
          onWidgetAdd={handleWidgetAdd}
          onWidgetRemove={handleWidgetRemove}
          onWidgetUpdate={handleWidgetUpdate}
          availableWidgets={availableWidgets}
        />
      </Box>

      {/* Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Dashboard Settings</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Dashboard settings and configuration options would go here.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};