import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockUser, mockApiResponse } from '../../utils/testHelpers';
import { App } from '../../App';

// Mock all services
jest.mock('../../services/authService', () => ({
  authService: {
    login: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
    refreshToken: jest.fn(),
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

jest.mock('../../services/searchService', () => ({
  searchService: {
    search: jest.fn(),
    getSuggestions: jest.fn(),
    saveSearch: jest.fn(),
  },
}));

describe('Complete User Journey E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Mock successful authentication
    const mockAuthService = require('../../services/authService').authService;
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
    mockAuthService.login.mockResolvedValue({ user: mockUser, token: 'mock-token' });
  });

  it('completes full user onboarding journey', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<App />);

    // 1. User lands on login page
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();

    // 2. User enters credentials and logs in
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(loginButton);

    // 3. User is redirected to dashboard
    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });

    // 4. User sees onboarding tour
    expect(screen.getByText(/getting started/i)).toBeInTheDocument();
    
    // 5. User completes tour
    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);
    await user.click(nextButton);
    await user.click(nextButton);
    
    const finishButton = screen.getByRole('button', { name: /finish/i });
    await user.click(finishButton);

    // 6. User sees main dashboard
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });

  it('completes security analyst workflow', async () => {
    const user = userEvent.setup();
    
    // Mock security analyst user
    const securityAnalyst = { ...mockUser, role: 'security_analyst' };
    const mockAuthService = require('../../services/authService').authService;
    mockAuthService.getCurrentUser.mockResolvedValue(securityAnalyst);
    
    renderWithProviders(<App />);

    // Skip login for this test
    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });

    // 1. Analyst views security dashboard
    expect(screen.getByText(/security overview/i)).toBeInTheDocument();
    expect(screen.getByText(/active incidents/i)).toBeInTheDocument();

    // 2. Analyst investigates an incident
    const incidentCard = screen.getByText(/critical incident/i);
    await user.click(incidentCard);

    // 3. Incident details page opens
    await waitFor(() => {
      expect(screen.getByText(/incident details/i)).toBeInTheDocument();
    });

    // 4. Analyst reviews timeline
    const timelineTab = screen.getByRole('tab', { name: /timeline/i });
    await user.click(timelineTab);

    expect(screen.getByText(/event timeline/i)).toBeInTheDocument();

    // 5. Analyst adds investigation notes
    const notesTab = screen.getByRole('tab', { name: /notes/i });
    await user.click(notesTab);

    const notesInput = screen.getByLabelText(/add note/i);
    await user.type(notesInput, 'Investigating potential malware infection');

    const saveNoteButton = screen.getByRole('button', { name: /save note/i });
    await user.click(saveNoteButton);

    // 6. Analyst escalates incident
    const escalateButton = screen.getByRole('button', { name: /escalate/i });
    await user.click(escalateButton);

    // Confirmation dialog
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    // 7. Incident status updated
    await waitFor(() => {
      expect(screen.getByText(/escalated/i)).toBeInTheDocument();
    });
  });

  it('completes system administrator workflow', async () => {
    const user = userEvent.setup();
    
    // Mock system administrator user
    const sysAdmin = { ...mockUser, role: 'system_admin' };
    const mockAuthService = require('../../services/authService').authService;
    mockAuthService.getCurrentUser.mockResolvedValue(sysAdmin);
    
    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });

    // 1. Admin navigates to agent management
    const agentsNavItem = screen.getByRole('link', { name: /agents/i });
    await user.click(agentsNavItem);

    // 2. Agent management page loads
    await waitFor(() => {
      expect(screen.getByText(/agent management/i)).toBeInTheDocument();
    });

    // 3. Admin views agent status
    expect(screen.getByText(/threat hunter/i)).toBeInTheDocument();
    expect(screen.getByText(/active/i)).toBeInTheDocument();

    // 4. Admin configures an agent
    const configureButton = screen.getByRole('button', { name: /configure/i });
    await user.click(configureButton);

    // 5. Configuration dialog opens
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // 6. Admin updates configuration
    const scanIntervalInput = screen.getByLabelText(/scan interval/i);
    await user.clear(scanIntervalInput);
    await user.type(scanIntervalInput, '600');

    const saveConfigButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveConfigButton);

    // 7. Configuration saved
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // 8. Admin views agent logs
    const logsTab = screen.getByRole('tab', { name: /logs/i });
    await user.click(logsTab);

    expect(screen.getByText(/agent logs/i)).toBeInTheDocument();
  });

  it('completes financial analyst workflow', async () => {
    const user = userEvent.setup();
    
    // Mock financial analyst user
    const financialAnalyst = { ...mockUser, role: 'financial_analyst' };
    const mockAuthService = require('../../services/authService').authService;
    mockAuthService.getCurrentUser.mockResolvedValue(financialAnalyst);
    
    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });

    // 1. Analyst navigates to financial dashboard
    const financialNavItem = screen.getByRole('link', { name: /financial/i });
    await user.click(financialNavItem);

    // 2. Financial dashboard loads
    await waitFor(() => {
      expect(screen.getByText(/financial overview/i)).toBeInTheDocument();
    });

    // 3. Analyst views cost analysis
    expect(screen.getByText(/cost analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/budget tracking/i)).toBeInTheDocument();

    // 4. Analyst uses ROI calculator
    const roiCalculatorTab = screen.getByRole('tab', { name: /roi calculator/i });
    await user.click(roiCalculatorTab);

    // 5. Enter ROI parameters
    const investmentInput = screen.getByLabelText(/investment amount/i);
    await user.type(investmentInput, '100000');

    const savingsInput = screen.getByLabelText(/annual savings/i);
    await user.type(savingsInput, '25000');

    const calculateButton = screen.getByRole('button', { name: /calculate/i });
    await user.click(calculateButton);

    // 6. ROI results displayed
    await waitFor(() => {
      expect(screen.getByText(/roi: 25%/i)).toBeInTheDocument();
    });

    // 7. Analyst exports report
    const exportButton = screen.getByRole('button', { name: /export report/i });
    await user.click(exportButton);

    // Export dialog
    const pdfOption = screen.getByText(/pdf/i);
    await user.click(pdfOption);

    const confirmExportButton = screen.getByRole('button', { name: /export/i });
    await user.click(confirmExportButton);
  });

  it('completes cross-functional collaboration workflow', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });

    // 1. User searches across system
    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'security incident');
    await user.keyboard('{Enter}');

    // 2. Search results displayed
    await waitFor(() => {
      expect(screen.getByText(/search results/i)).toBeInTheDocument();
    });

    // 3. User filters results
    const securityFilter = screen.getByText(/security/i);
    await user.click(securityFilter);

    // 4. User opens incident from search
    const incidentResult = screen.getByText(/critical security incident/i);
    await user.click(incidentResult);

    // 5. User collaborates on incident
    await waitFor(() => {
      expect(screen.getByText(/incident collaboration/i)).toBeInTheDocument();
    });

    // 6. User adds team member
    const addMemberButton = screen.getByRole('button', { name: /add member/i });
    await user.click(addMemberButton);

    const memberSelect = screen.getByLabelText(/select member/i);
    await user.click(memberSelect);
    await user.click(screen.getByText(/john doe/i));

    const addButton = screen.getByRole('button', { name: /add/i });
    await user.click(addButton);

    // 7. User shares dashboard
    const shareButton = screen.getByRole('button', { name: /share/i });
    await user.click(shareButton);

    const shareDialog = screen.getByRole('dialog');
    expect(shareDialog).toBeInTheDocument();

    const shareWithTeamButton = screen.getByRole('button', { name: /share with team/i });
    await user.click(shareWithTeamButton);

    // 8. Collaboration established
    await waitFor(() => {
      expect(screen.getByText(/shared successfully/i)).toBeInTheDocument();
    });
  });

  it('handles error scenarios gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock network error
    const mockAuthService = require('../../services/authService').authService;
    mockAuthService.getCurrentUser.mockRejectedValue(new Error('Network error'));
    
    renderWithProviders(<App />);

    // 1. Error state displayed
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    // 2. User can retry
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    // 3. Fix the error and retry
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
    await user.click(retryButton);

    // 4. Application recovers
    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });

  it('maintains accessibility throughout user journey', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<App />);

    // Skip login
    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });

    // 1. Test keyboard navigation
    await user.tab();
    expect(document.activeElement).toHaveAttribute('role', 'button');

    // 2. Test screen reader support
    const mainContent = screen.getByRole('main');
    expect(mainContent).toBeInTheDocument();

    // 3. Test focus management
    const menuButton = screen.getByRole('button', { name: /menu/i });
    await user.click(menuButton);

    // Focus should move to menu
    expect(document.activeElement).toHaveAttribute('role', 'menu');

    // 4. Test high contrast mode
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    await user.click(settingsButton);

    const highContrastToggle = screen.getByLabelText(/high contrast/i);
    await user.click(highContrastToggle);

    // High contrast should be applied
    expect(document.body).toHaveClass('high-contrast');
  });

  it('performs well under load', async () => {
    const user = userEvent.setup();
    
    // Mock large dataset
    const mockSearchService = require('../../services/searchService').searchService;
    mockSearchService.search.mockResolvedValue({
      results: Array.from({ length: 1000 }, (_, i) => ({
        id: `result-${i}`,
        title: `Result ${i}`,
        description: `Description for result ${i}`,
        type: 'incident',
        category: 'Security',
        url: `/incidents/${i}`,
        relevanceScore: Math.random(),
        highlights: [],
        metadata: {},
        timestamp: new Date(),
      })),
      totalCount: 1000,
      facets: {},
    });
    
    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });

    // Measure performance
    const startTime = performance.now();

    // Perform search with large result set
    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'test');
    await user.keyboard('{Enter}');

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText(/1000 results/i)).toBeInTheDocument();
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should complete within reasonable time (5 seconds)
    expect(duration).toBeLessThan(5000);

    // Should handle scrolling smoothly
    const resultsContainer = screen.getByTestId('search-results');
    fireEvent.scroll(resultsContainer, { target: { scrollTop: 1000 } });

    // Should load more results
    await waitFor(() => {
      expect(screen.getByText(/result 50/i)).toBeInTheDocument();
    });
  });
});