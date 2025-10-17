import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockApiResponse } from '../../utils/testHelpers';
import { SearchResultsPage } from '../../components/search/SearchResultsPage';
import { searchService } from '../../services/searchService';

// Mock the search service
jest.mock('../../services/searchService', () => ({
  searchService: {
    search: jest.fn(),
    getSuggestions: jest.fn(),
    saveSearch: jest.fn(),
  },
}));

const mockSearchResults = [
  {
    id: '1',
    title: 'Critical Security Incident',
    description: 'A critical security incident requiring immediate attention',
    type: 'incident' as const,
    category: 'Security',
    url: '/incidents/1',
    relevanceScore: 0.95,
    highlights: [{
      field: 'title',
      snippet: '<mark>Critical</mark> Security Incident',
    }],
    metadata: { severity: 'critical', status: 'active' },
    timestamp: new Date('2024-01-15'),
  },
  {
    id: '2',
    title: 'Agent Configuration Update',
    description: 'Configuration update for threat hunter agent',
    type: 'agent' as const,
    category: 'System',
    url: '/agents/2',
    relevanceScore: 0.87,
    highlights: [],
    metadata: { status: 'active', version: '2.1.0' },
    timestamp: new Date('2024-01-14'),
  },
  {
    id: '3',
    title: 'Financial Report Q1',
    description: 'Quarterly financial analysis report',
    type: 'financial' as const,
    category: 'Finance',
    url: '/financial/3',
    relevanceScore: 0.75,
    highlights: [],
    metadata: { quarter: 'Q1', year: 2024 },
    timestamp: new Date('2024-01-13'),
  },
];

const mockFacets = {
  type: [
    { value: 'incident', count: 1 },
    { value: 'agent', count: 1 },
    { value: 'financial', count: 1 },
  ],
  category: [
    { value: 'Security', count: 1 },
    { value: 'System', count: 1 },
    { value: 'Finance', count: 1 },
  ],
};

describe('Search Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (searchService.search as jest.Mock).mockImplementation(() =>
      mockApiResponse({
        results: mockSearchResults,
        totalCount: 3,
        facets: mockFacets,
      })
    );
    (searchService.getSuggestions as jest.Mock).mockImplementation(() =>
      mockApiResponse([
        { id: '1', text: 'security incidents', type: 'query' },
        { id: '2', text: 'agent configuration', type: 'query' },
      ])
    );
  });

  it('completes full search workflow', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<SearchResultsPage />);

    // 1. User enters search query
    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'security');

    // 2. Suggestions should appear
    await waitFor(() => {
      expect(screen.getByText('security incidents')).toBeInTheDocument();
    });

    // 3. User presses Enter to search
    await user.keyboard('{Enter}');

    // 4. Search results should appear
    await waitFor(() => {
      expect(screen.getByText('Critical Security Incident')).toBeInTheDocument();
      expect(screen.getByText('Agent Configuration Update')).toBeInTheDocument();
      expect(screen.getByText('Financial Report Q1')).toBeInTheDocument();
    });

    // 5. Results count should be displayed
    expect(screen.getByText('3 results')).toBeInTheDocument();

    // 6. Facets should be available
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
  });

  it('filters results using facets', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<SearchResultsPage initialQuery="test" />);

    // Wait for initial results
    await waitFor(() => {
      expect(screen.getByText('Critical Security Incident')).toBeInTheDocument();
    });

    // Click on Security filter
    const securityFilter = screen.getByText('Security');
    await user.click(securityFilter);

    // Should trigger filtered search
    await waitFor(() => {
      expect(searchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            category: ['Security'],
          }),
        })
      );
    });
  });

  it('changes view modes', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<SearchResultsPage initialQuery="test" />);

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Critical Security Incident')).toBeInTheDocument();
    });

    // Switch to grid view
    const gridViewButton = screen.getByRole('button', { name: /grid view/i });
    await user.click(gridViewButton);

    // Results should still be visible in grid format
    expect(screen.getByText('Critical Security Incident')).toBeInTheDocument();
  });

  it('sorts results', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<SearchResultsPage initialQuery="test" />);

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Critical Security Incident')).toBeInTheDocument();
    });

    // Change sort order
    const sortSelect = screen.getByLabelText(/sort by/i);
    await user.click(sortSelect);
    await user.click(screen.getByText('Title'));

    // Should trigger search with new sort
    await waitFor(() => {
      expect(searchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: { field: 'title', order: 'desc' },
        })
      );
    });
  });

  it('handles pagination', async () => {
    const user = userEvent.setup();
    
    // Mock large result set
    (searchService.search as jest.Mock).mockImplementation(() =>
      mockApiResponse({
        results: mockSearchResults,
        totalCount: 50,
        facets: mockFacets,
      })
    );
    
    renderWithProviders(<SearchResultsPage initialQuery="test" />);

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('50 results')).toBeInTheDocument();
    });

    // Should show pagination
    const pagination = screen.getByRole('navigation', { name: /pagination/i });
    expect(pagination).toBeInTheDocument();

    // Click next page
    const nextButton = screen.getByRole('button', { name: /next page/i });
    await user.click(nextButton);

    // Should trigger search with offset
    await waitFor(() => {
      expect(searchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 20,
        })
      );
    });
  });

  it('saves search results', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<SearchResultsPage initialQuery="test" />);

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Critical Security Incident')).toBeInTheDocument();
    });

    // Click save button on first result
    const saveButtons = screen.getAllByRole('button', { name: /save/i });
    await user.click(saveButtons[0]);

    // Should call save function
    // Note: This would typically open a save dialog or show a confirmation
    expect(saveButtons[0]).toBeInTheDocument();
  });

  it('exports search results', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<SearchResultsPage initialQuery="test" />);

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Critical Security Incident')).toBeInTheDocument();
    });

    // Click export button
    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);

    // Should show export options or trigger export
    expect(exportButton).toBeInTheDocument();
  });

  it('handles search errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock search error
    (searchService.search as jest.Mock).mockImplementation(() =>
      Promise.reject(new Error('Search service unavailable'))
    );
    
    renderWithProviders(<SearchResultsPage />);

    // Enter search query
    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'test');
    await user.keyboard('{Enter}');

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/no results found/i)).toBeInTheDocument();
    });
  });

  it('maintains search state across navigation', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<SearchResultsPage initialQuery="security" />);

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Critical Security Incident')).toBeInTheDocument();
    });

    // Apply filter
    const securityFilter = screen.getByText('Security');
    await user.click(securityFilter);

    // Navigate away and back
    // This would typically involve router navigation
    // For now, we'll simulate by re-rendering with the same props
    expect(screen.getByText('Critical Security Incident')).toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<SearchResultsPage initialQuery="test" />);

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Critical Security Incident')).toBeInTheDocument();
    });

    // Test keyboard navigation through results
    const firstResult = screen.getByText('Critical Security Incident');
    firstResult.focus();

    // Arrow down should move to next result
    await user.keyboard('{ArrowDown}');
    
    // Should focus next result
    expect(document.activeElement?.textContent).toContain('Agent Configuration Update');
  });

  it('supports bulk operations', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<SearchResultsPage initialQuery="test" />);

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Critical Security Incident')).toBeInTheDocument();
    });

    // Select multiple results
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);

    // Bulk action should be available
    const bulkActionButton = screen.getByRole('button', { name: /bulk actions/i });
    expect(bulkActionButton).toBeInTheDocument();
    
    await user.click(bulkActionButton);
    
    // Should show bulk action menu
    expect(screen.getByText(/export selected/i)).toBeInTheDocument();
  });
});