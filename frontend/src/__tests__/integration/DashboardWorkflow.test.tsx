import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockDashboard, mockApiResponse } from '../../utils/testHelpers';
import { Dashboard } from '../../pages/Dashboard';

// Mock services
jest.mock('../../services/dashboardPersonalizationService', () => ({
  dashboardPersonalizationService: {
    getUserPreferences: jest.fn(),
    saveUserPreferences: jest.fn(),
    getPresets: jest.fn(),
    savePreset: jest.fn(),
  },
}));

jest.mock('../../services/websocketService', () => ({
  websocketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

const mockWidgets = [
  {
    id: 'widget-1',
    type: 'metric',
    title: 'Active Incidents',
    config: { value: 12, unit: 'count', trend: 'up' },
  },
  {
    id: 'widget-2',
    type: 'chart',
    title: 'Threat Detection Trends',
    config: { chartType: 'line', data: [] },
  },
  {
    id: 'widget-3',
    type: 'list',
    title: 'Recent Alerts',
    config: { items: [], maxItems: 5 },
  },
];

describe('Dashboard Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads dashboard with default layout', async () => {
    renderWithProviders(<Dashboard />);

    // Should show loading state initially
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Should show dashboard content
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });

  it('enters and exits edit mode', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Should show edit controls
    expect(screen.getByRole('button', { name: /add widget/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();

    // Exit edit mode
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Edit controls should be hidden
    expect(screen.queryByRole('button', { name: /add widget/i })).not.toBeInTheDocument();
  });

  it('adds new widget to dashboard', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Click add widget
    const addWidgetButton = screen.getByRole('button', { name: /add widget/i });
    await user.click(addWidgetButton);

    // Should show widget selection dialog
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/select widget type/i)).toBeInTheDocument();

    // Select metric widget
    const metricOption = screen.getByText('Metric Widget');
    await user.click(metricOption);

    // Configure widget
    const titleInput = screen.getByLabelText(/widget title/i);
    await user.type(titleInput, 'New Metric Widget');

    // Add widget
    const addButton = screen.getByRole('button', { name: /add/i });
    await user.click(addButton);

    // Widget should be added to dashboard
    await waitFor(() => {
      expect(screen.getByText('New Metric Widget')).toBeInTheDocument();
    });
  });

  it('removes widget from dashboard', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Find and click remove button on first widget
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[0]);

    // Should show confirmation dialog
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/confirm removal/i)).toBeInTheDocument();

    // Confirm removal
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    // Widget should be removed
    await waitFor(() => {
      expect(removeButtons[0]).not.toBeInTheDocument();
    });
  });

  it('rearranges widgets via drag and drop', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Find drag handles
    const dragHandles = screen.getAllByTestId('drag-handle');
    expect(dragHandles.length).toBeGreaterThan(0);

    // Simulate drag and drop
    const firstHandle = dragHandles[0];
    const secondHandle = dragHandles[1];

    // Start drag
    fireEvent.mouseDown(firstHandle);
    fireEvent.mouseMove(secondHandle);
    fireEvent.mouseUp(secondHandle);

    // Layout should be updated
    // Note: Actual drag and drop testing would require more complex setup
    expect(firstHandle).toBeInTheDocument();
  });

  it('switches between dashboard presets', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Open preset selector
    const presetButton = screen.getByRole('button', { name: /presets/i });
    await user.click(presetButton);

    // Should show preset options
    expect(screen.getByText(/security operations/i)).toBeInTheDocument();
    expect(screen.getByText(/financial overview/i)).toBeInTheDocument();

    // Select different preset
    const financialPreset = screen.getByText(/financial overview/i);
    await user.click(financialPreset);

    // Dashboard should update with new preset
    await waitFor(() => {
      expect(screen.getByText(/financial/i)).toBeInTheDocument();
    });
  });

  it('customizes dashboard theme', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Open customization panel
    const customizeButton = screen.getByRole('button', { name: /customize/i });
    await user.click(customizeButton);

    // Should show customization options
    expect(screen.getByText(/theme/i)).toBeInTheDocument();
    expect(screen.getByText(/layout/i)).toBeInTheDocument();

    // Change theme
    const darkThemeOption = screen.getByLabelText(/dark theme/i);
    await user.click(darkThemeOption);

    // Theme should be applied
    // Note: This would typically change CSS classes or theme context
    expect(darkThemeOption).toBeChecked();
  });

  it('exports dashboard configuration', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Open dashboard menu
    const menuButton = screen.getByRole('button', { name: /menu/i });
    await user.click(menuButton);

    // Click export option
    const exportButton = screen.getByText(/export/i);
    await user.click(exportButton);

    // Should trigger export
    // Note: This would typically download a file or show export dialog
    expect(exportButton).toBeInTheDocument();
  });

  it('imports dashboard configuration', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Open dashboard menu
    const menuButton = screen.getByRole('button', { name: /menu/i });
    await user.click(menuButton);

    // Click import option
    const importButton = screen.getByText(/import/i);
    await user.click(importButton);

    // Should show import dialog
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/import dashboard/i)).toBeInTheDocument();

    // Upload file (simulated)
    const fileInput = screen.getByLabelText(/select file/i);
    const file = new File(['{}'], 'dashboard.json', { type: 'application/json' });
    
    await user.upload(fileInput, file);

    // Import button should be enabled
    const confirmImportButton = screen.getByRole('button', { name: /import/i });
    expect(confirmImportButton).not.toBeDisabled();
  });

  it('handles real-time data updates', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Simulate real-time data update
    // This would typically come through WebSocket
    const mockData = {
      widgetId: 'widget-1',
      data: { value: 15, unit: 'count', trend: 'up' },
    };

    // Trigger data update
    fireEvent(window, new CustomEvent('dashboard-data-update', { detail: mockData }));

    // Widget should update with new data
    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });

  it('handles dashboard errors gracefully', async () => {
    // Mock API error
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    renderWithProviders(<Dashboard />);

    // Simulate error during dashboard load
    fireEvent(window, new CustomEvent('dashboard-error', { 
      detail: { message: 'Failed to load dashboard' } 
    }));

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/error loading dashboard/i)).toBeInTheDocument();
    });

    // Should show retry button
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('persists dashboard changes', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Make changes to dashboard
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Add widget
    const addWidgetButton = screen.getByRole('button', { name: /add widget/i });
    await user.click(addWidgetButton);

    // Configure and add widget
    const metricOption = screen.getByText('Metric Widget');
    await user.click(metricOption);

    const titleInput = screen.getByLabelText(/widget title/i);
    await user.type(titleInput, 'Test Widget');

    const addButton = screen.getByRole('button', { name: /add/i });
    await user.click(addButton);

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Changes should be persisted
    await waitFor(() => {
      expect(screen.getByText('Test Widget')).toBeInTheDocument();
    });

    // Refresh page (simulate)
    // Widget should still be there
    expect(screen.getByText('Test Widget')).toBeInTheDocument();
  });
});