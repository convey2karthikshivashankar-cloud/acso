import React from 'react';
import {
  Box,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Snackbar,
  Alert,
  Backdrop,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Settings,
  Palette,
  ViewModule,
  Save,
  Refresh,
  Fullscreen,
  FullscreenExit,
  Share,
  Download,
  Upload,
  RestoreFromTrash,
} from '@mui/icons-material';
import { DashboardLayoutEngine, DashboardTemplate } from './DashboardLayoutEngine';
import { DashboardThemeProvider, DashboardCustomizationProvider, useDashboardCustomization, createDefaultCustomization } from './DashboardThemeProvider';
import { DashboardPresetBrowser } from './DashboardPresetBrowser';
import { UserRole } from './RoleBasedDashboard';
import { dashboardPersonalizationService, DashboardPreset } from '../../services/dashboardPersonalizationService';

interface EnhancedDashboardProps {
  dashboard: DashboardTemplate;
  userId: string;
  userRole: UserRole;
  onSaveCustomization?: (customization: DashboardCustomization) => Promise<void>;
  onResetCustomization?: () => Promise<void>;
  onExportCustomization?: () => Promise<string>;
  onImportCustomization?: (data: string) => Promise<void>;
}

interface DashboardControlsProps {
  dashboard: DashboardTemplate;
  userId: string;
  userRole: UserRole;
  onExport?: () => Promise<string>;
  onImport?: (data: string) => Promise<void>;
}

const DashboardControls: React.FC<DashboardControlsProps> = ({
  dashboard,
  userId,
  userRole,
  onExport,
  onImport,
}) => {
  const theme = useTheme();
  const {
    customization,
    updateCustomization,
    resetCustomization,
    saveCustomization,
    isCustomizing,
    setCustomizing,
  } = useDashboardCustomization();

  const [customizerOpen, setCustomizerOpen] = React.useState(false);
  const [presetBrowserOpen, setPresetBrowserOpen] = React.useState(false);
  const [speedDialOpen, setSpeedDialOpen] = React.useState(false);
  const [notification, setNotification] = React.useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'info' });
  const [loading, setLoading] = React.useState(false);

  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const handleSaveCustomization = async () => {
    try {
      setLoading(true);
      await saveCustomization();
      showNotification('Dashboard customization saved successfully!', 'success');
    } catch (error) {
      showNotification('Failed to save customization', 'error');
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetCustomization = async () => {
    try {
      setLoading(true);
      await resetCustomization();
      showNotification('Dashboard reset to default settings', 'info');
    } catch (error) {
      showNotification('Failed to reset customization', 'error');
      console.error('Reset error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = async (preset: DashboardPreset) => {
    try {
      setLoading(true);
      const updatedCustomization = await dashboardPersonalizationService.applyPreset(
        userId,
        dashboard.id,
        preset.id,
        dashboard
      );
      updateCustomization(updatedCustomization);
      showNotification(`Applied preset: ${preset.name}`, 'success');
    } catch (error) {
      showNotification('Failed to apply preset', 'error');
      console.error('Preset application error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewPreset = (preset: DashboardPreset) => {
    // Create a temporary customization for preview
    const previewCustomization = {
      ...customization,
      ...preset.customization,
    };
    updateCustomization(previewCustomization);
    showNotification(`Previewing: ${preset.name}`, 'info');
  };

  const handleExportCustomization = async () => {
    try {
      setLoading(true);
      const exportData = onExport ? 
        await onExport() : 
        await dashboardPersonalizationService.exportCustomizations(userId);
      
      // Create and download file
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-customization-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showNotification('Customization exported successfully!', 'success');
    } catch (error) {
      showNotification('Failed to export customization', 'error');
      console.error('Export error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportCustomization = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          setLoading(true);
          const text = await file.text();
          
          if (onImport) {
            await onImport(text);
          } else {
            await dashboardPersonalizationService.importCustomizations(userId, text);
          }
          
          // Reload customization
          const updatedCustomization = await dashboardPersonalizationService.getDashboardCustomization(userId, dashboard.id);
          if (updatedCustomization) {
            updateCustomization(updatedCustomization);
          }
          
          showNotification('Customization imported successfully!', 'success');
        } catch (error) {
          showNotification('Failed to import customization', 'error');
          console.error('Import error:', error);
        } finally {
          setLoading(false);
        }
      };
      input.click();
    } catch (error) {
      showNotification('Failed to import customization', 'error');
      console.error('Import error:', error);
    }
  };

  const handleToggleFullscreen = () => {
    updateCustomization({
      preferences: {
        ...customization.preferences,
        fullscreenMode: !customization.preferences.fullscreenMode,
      },
    });
  };

  const speedDialActions = [
    {
      icon: <Settings />,
      name: 'Customize',
      onClick: () => setCustomizerOpen(true),
    },
    {
      icon: <ViewModule />,
      name: 'Browse Presets',
      onClick: () => setPresetBrowserOpen(true),
    },
    {
      icon: <Save />,
      name: 'Save Changes',
      onClick: handleSaveCustomization,
    },
    {
      icon: <Download />,
      name: 'Export Settings',
      onClick: handleExportCustomization,
    },
    {
      icon: <Upload />,
      name: 'Import Settings',
      onClick: handleImportCustomization,
    },
    {
      icon: <RestoreFromTrash />,
      name: 'Reset to Default',
      onClick: handleResetCustomization,
    },
    {
      icon: customization.preferences.fullscreenMode ? <FullscreenExit /> : <Fullscreen />,
      name: customization.preferences.fullscreenMode ? 'Exit Fullscreen' : 'Fullscreen',
      onClick: handleToggleFullscreen,
    },
  ];

  return (
    <>
      {/* Speed Dial for Dashboard Controls */}
      <SpeedDial
        ariaLabel="Dashboard Controls"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1200,
        }}
        icon={<SpeedDialIcon />}
        open={speedDialOpen}
        onOpen={() => setSpeedDialOpen(true)}
        onClose={() => setSpeedDialOpen(false)}
      >
        {speedDialActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={() => {
              action.onClick();
              setSpeedDialOpen(false);
            }}
          />
        ))}
      </SpeedDial>

      {/* Fullscreen Exit Button */}
      {customization.preferences.fullscreenMode && (
        <Fab
          color="primary"
          size="small"
          sx={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 1301,
          }}
          onClick={handleToggleFullscreen}
        >
          <FullscreenExit />
        </Fab>
      )}

      {/* Dashboard Customizer Dialog */}
      <DashboardCustomizer
        open={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        dashboard={dashboard}
        customization={customization}
        userRole={userRole}
        onSave={async (customization) => {
          updateCustomization(customization);
          await saveCustomization();
        }}
        onReset={handleResetCustomization}
        onPreview={updateCustomization}
      />

      {/* Preset Browser Dialog */}
      <DashboardPresetBrowser
        open={presetBrowserOpen}
        onClose={() => setPresetBrowserOpen(false)}
        dashboard={dashboard}
        userId={userId}
        onApplyPreset={handleApplyPreset}
        onPreviewPreset={handlePreviewPreset}
      />

      {/* Loading Backdrop */}
      <Backdrop
        sx={{ color: '#fff', zIndex: theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.severity}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export const EnhancedDashboard: React.FC<EnhancedDashboardProps> = ({
  dashboard,
  userId,
  userRole,
  onSaveCustomization,
  onResetCustomization,
  onExportCustomization,
  onImportCustomization,
}) => {
  const [customization, setCustomization] = React.useState<DashboardCustomization | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadCustomization();
  }, [userId, dashboard.id]);

  const loadCustomization = async () => {
    try {
      setLoading(true);
      let userCustomization = await dashboardPersonalizationService.getDashboardCustomization(userId, dashboard.id);
      
      if (!userCustomization) {
        userCustomization = createDefaultCustomization(userId, dashboard.id, dashboard);
        await dashboardPersonalizationService.saveDashboardCustomization(userId, userCustomization);
      }
      
      setCustomization(userCustomization);
      
      // Track dashboard usage
      await dashboardPersonalizationService.trackDashboardUsage(userId, dashboard.id);
    } catch (error) {
      console.error('Failed to load customization:', error);
      // Fallback to default customization
      setCustomization(createDefaultCustomization(userId, dashboard.id, dashboard));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomization = async (customization: DashboardCustomization) => {
    try {
      if (onSaveCustomization) {
        await onSaveCustomization(customization);
      } else {
        await dashboardPersonalizationService.saveDashboardCustomization(userId, customization);
      }
    } catch (error) {
      console.error('Failed to save customization:', error);
      throw error;
    }
  };

  const handleResetCustomization = async () => {
    try {
      if (onResetCustomization) {
        await onResetCustomization();
      } else {
        const defaultCustomization = createDefaultCustomization(userId, dashboard.id, dashboard);
        await dashboardPersonalizationService.saveDashboardCustomization(userId, defaultCustomization);
        setCustomization(defaultCustomization);
      }
    } catch (error) {
      console.error('Failed to reset customization:', error);
      throw error;
    }
  };

  if (loading || !customization) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <DashboardCustomizationProvider
      initialCustomization={customization}
      onSave={handleSaveCustomization}
      onReset={handleResetCustomization}
    >
      <Box
        className="dashboard-container"
        sx={{
          minHeight: '100vh',
          ...(customization.preferences.fullscreenMode && {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1300,
            overflow: 'auto',
          }),
        }}
      >
        <DashboardLayoutEngine
          template={dashboard}
          customization={customization}
          userRole={userRole}
          editable={true}
          onLayoutChange={(layout) => {
            // Update widget positions in customization
            const updatedCustomization = {
              ...customization,
              widgets: customization.widgets.map(widget => {
                const layoutItem = layout.find(item => item.i === widget.id);
                return layoutItem ? { ...widget, ...layoutItem } : widget;
              }),
              updatedAt: new Date(),
            };
            setCustomization(updatedCustomization);
          }}
        />
        
        <DashboardControls
          dashboard={dashboard}
          userId={userId}
          userRole={userRole}
          onExport={onExportCustomization}
          onImport={onImportCustomization}
        />
      </Box>
    </DashboardCustomizationProvider>
  );
};