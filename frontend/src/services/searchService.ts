import { SearchResult, SearchSuggestion } from '../components/search/GlobalSearch';

export interface SearchIndex {
  id: string;
  title: string;
  content: string;
  type: SearchResult['type'];
  category: string;
  url: string;
  metadata: Record<string, any>;
  timestamp: Date;
  tags: string[];
}

export interface SearchQuery {
  query: string;
  filters?: {
    type?: SearchResult['type'][];
    category?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    tags?: string[];
  };
  sort?: {
    field: 'relevance' | 'date' | 'title';
    order: 'asc' | 'desc';
  };
  limit?: number;
  offset?: number;
}

class SearchService {
  private searchIndex: SearchIndex[] = [];
  private searchHistory: string[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Mock search index data
    this.searchIndex = [
      {
        id: '1',
        title: 'Critical Security Incident - Malware Detection',
        content: 'A critical security incident involving malware detection on multiple endpoints. The incident was detected by our threat hunting agents and requires immediate attention.',
        type: 'incident',
        category: 'Security',
        url: '/incidents/1',
        metadata: {
          severity: 'critical',
          status: 'active',
          assignee: 'Security Team',
        },
        timestamp: new Date('2024-01-15'),
        tags: ['malware', 'critical', 'endpoints'],
      },
      {
        id: '2',
        title: 'Threat Hunter Agent Configuration',
        content: 'Configuration settings for the threat hunter agent responsible for proactive threat detection and analysis.',
        type: 'agent',
        category: 'Configuration',
        url: '/agents/threat-hunter',
        metadata: {
          status: 'active',
          version: '2.1.0',
        },
        timestamp: new Date('2024-01-14'),
        tags: ['agent', 'threat-hunting', 'configuration'],
      },
      {
        id: '3',
        title: 'Incident Response Workflow',
        content: 'Standard operating procedure for incident response including containment, eradication, and recovery phases.',
        type: 'workflow',
        category: 'Process',
        url: '/workflows/incident-response',
        metadata: {
          version: '1.5',
          approved: true,
        },
        timestamp: new Date('2024-01-13'),
        tags: ['workflow', 'incident-response', 'sop'],
      },
      {
        id: '4',
        title: 'Security Operations Dashboard',
        content: 'Real-time dashboard showing security metrics, incident status, and threat intelligence feeds.',
        type: 'dashboard',
        category: 'Monitoring',
        url: '/dashboards/security-ops',
        metadata: {
          widgets: 12,
          lastUpdated: new Date(),
        },
        timestamp: new Date('2024-01-12'),
        tags: ['dashboard', 'security', 'monitoring'],
      },
      {
        id: '5',
        title: 'Cost Analysis Report Q1 2024',
        content: 'Quarterly cost analysis report showing infrastructure spending, optimization opportunities, and budget variance.',
        type: 'financial',
        category: 'Reports',
        url: '/financial/reports/q1-2024',
        metadata: {
          quarter: 'Q1',
          year: 2024,
          totalCost: 125000,
        },
        timestamp: new Date('2024-01-11'),
        tags: ['financial', 'cost-analysis', 'quarterly'],
      },
      {
        id: '6',
        title: 'User Management Documentation',
        content: 'Comprehensive guide for user management including role assignments, permissions, and access controls.',
        type: 'document',
        category: 'Documentation',
        url: '/docs/user-management',
        metadata: {
          version: '2.0',
          author: 'Admin Team',
        },
        timestamp: new Date('2024-01-10'),
        tags: ['documentation', 'user-management', 'permissions'],
      },
    ];
  }

  async search(searchQuery: SearchQuery): Promise<{
    results: SearchResult[];
    totalCount: number;
    facets: Record<string, { value: string; count: number }[]>;
  }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    let filteredResults = [...this.searchIndex];

    // Apply text search
    if (searchQuery.query.trim()) {
      const query = searchQuery.query.toLowerCase();
      filteredResults = filteredResults.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply filters
    if (searchQuery.filters) {
      if (searchQuery.filters.type && searchQuery.filters.type.length > 0) {
        filteredResults = filteredResults.filter(item => 
          searchQuery.filters!.type!.includes(item.type)
        );
      }

      if (searchQuery.filters.category && searchQuery.filters.category.length > 0) {
        filteredResults = filteredResults.filter(item => 
          searchQuery.filters!.category!.includes(item.category)
        );
      }

      if (searchQuery.filters.dateRange) {
        filteredResults = filteredResults.filter(item => 
          item.timestamp >= searchQuery.filters!.dateRange!.start &&
          item.timestamp <= searchQuery.filters!.dateRange!.end
        );
      }

      if (searchQuery.filters.tags && searchQuery.filters.tags.length > 0) {
        filteredResults = filteredResults.filter(item => 
          searchQuery.filters!.tags!.some(tag => item.tags.includes(tag))
        );
      }
    }

    // Calculate relevance scores
    const resultsWithScores = filteredResults.map(item => {
      let relevanceScore = 0.5; // Base score

      if (searchQuery.query.trim()) {
        const query = searchQuery.query.toLowerCase();
        
        // Title match gets higher score
        if (item.title.toLowerCase().includes(query)) {
          relevanceScore += 0.4;
        }
        
        // Content match
        if (item.content.toLowerCase().includes(query)) {
          relevanceScore += 0.2;
        }
        
        // Tag match
        if (item.tags.some(tag => tag.toLowerCase().includes(query))) {
          relevanceScore += 0.3;
        }
        
        // Exact match bonus
        if (item.title.toLowerCase() === query) {
          relevanceScore += 0.3;
        }
      }

      // Recency bonus
      const daysSinceCreation = (Date.now() - item.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 7) {
        relevanceScore += 0.1;
      }

      return {
        ...item,
        relevanceScore: Math.min(relevanceScore, 1.0),
      };
    });

    // Sort results
    const sortField = searchQuery.sort?.field || 'relevance';
    const sortOrder = searchQuery.sort?.order || 'desc';

    resultsWithScores.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'relevance':
          comparison = a.relevanceScore - b.relevanceScore;
          break;
        case 'date':
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const offset = searchQuery.offset || 0;
    const limit = searchQuery.limit || 50;
    const paginatedResults = resultsWithScores.slice(offset, offset + limit);

    // Convert to SearchResult format
    const searchResults: SearchResult[] = paginatedResults.map(item => ({
      id: item.id,
      title: item.title,
      description: item.content.substring(0, 200) + (item.content.length > 200 ? '...' : ''),
      type: item.type,
      category: item.category,
      url: item.url,
      relevanceScore: item.relevanceScore,
      highlights: this.generateHighlights(item, searchQuery.query),
      metadata: item.metadata,
      timestamp: item.timestamp,
    }));

    // Generate facets
    const facets = this.generateFacets(filteredResults);

    return {
      results: searchResults,
      totalCount: filteredResults.length,
      facets,
    };
  }

  async getSuggestions(query: string): Promise<SearchSuggestion[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 150));

    const suggestions: SearchSuggestion[] = [];
    const queryLower = query.toLowerCase();

    // Query suggestions based on search history
    const historySuggestions = this.searchHistory
      .filter(h => h.toLowerCase().includes(queryLower))
      .slice(0, 3)
      .map((h, index) => ({
        id: `history-${index}`,
        text: h,
        type: 'query' as const,
      }));

    suggestions.push(...historySuggestions);

    // Entity suggestions
    const entities = [
      { text: 'incidents', category: 'Security' },
      { text: 'agents', category: 'System' },
      { text: 'workflows', category: 'Process' },
      { text: 'dashboards', category: 'Monitoring' },
      { text: 'financial reports', category: 'Finance' },
    ];

    const entitySuggestions = entities
      .filter(e => e.text.includes(queryLower))
      .map((e, index) => ({
        id: `entity-${index}`,
        text: e.text,
        type: 'entity' as const,
        category: e.category,
        count: Math.floor(Math.random() * 50) + 1,
      }));

    suggestions.push(...entitySuggestions);

    // Filter suggestions
    const filters = [
      'type:incident',
      'type:agent',
      'category:Security',
      'category:Finance',
      'status:active',
      'severity:critical',
    ];

    const filterSuggestions = filters
      .filter(f => f.includes(queryLower))
      .map((f, index) => ({
        id: `filter-${index}`,
        text: f,
        type: 'filter' as const,
      }));

    suggestions.push(...filterSuggestions);

    return suggestions.slice(0, 10);
  }

  async saveSearch(query: string, filters?: SearchQuery['filters']): Promise<void> {
    // Add to search history
    this.searchHistory = [query, ...this.searchHistory.filter(h => h !== query)].slice(0, 20);
    
    // In a real implementation, this would save to backend
    console.log('Saved search:', { query, filters });
  }

  async getPopularSearches(): Promise<{ query: string; count: number }[]> {
    // Mock popular searches
    return [
      { query: 'security incidents', count: 45 },
      { query: 'agent configuration', count: 32 },
      { query: 'cost analysis', count: 28 },
      { query: 'workflow templates', count: 21 },
      { query: 'dashboard metrics', count: 18 },
    ];
  }

  async getSearchAnalytics(): Promise<{
    totalSearches: number;
    averageResultsPerSearch: number;
    topQueries: { query: string; count: number }[];
    searchTrends: { date: Date; count: number }[];
  }> {
    // Mock analytics data
    return {
      totalSearches: 1247,
      averageResultsPerSearch: 8.3,
      topQueries: await this.getPopularSearches(),
      searchTrends: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        count: Math.floor(Math.random() * 50) + 10,
      })),
    };
  }

  private generateHighlights(item: SearchIndex, query: string): SearchResult['highlights'] {
    if (!query.trim()) return [];

    const highlights: SearchResult['highlights'] = [];
    const queryLower = query.toLowerCase();

    // Title highlights
    if (item.title.toLowerCase().includes(queryLower)) {
      const index = item.title.toLowerCase().indexOf(queryLower);
      const snippet = item.title.substring(Math.max(0, index - 20), index + query.length + 20);
      highlights.push({
        field: 'title',
        snippet: snippet.replace(new RegExp(query, 'gi'), `<mark>$&</mark>`),
      });
    }

    // Content highlights
    if (item.content.toLowerCase().includes(queryLower)) {
      const index = item.content.toLowerCase().indexOf(queryLower);
      const snippet = item.content.substring(Math.max(0, index - 50), index + query.length + 50);
      highlights.push({
        field: 'content',
        snippet: snippet.replace(new RegExp(query, 'gi'), `<mark>$&</mark>`),
      });
    }

    return highlights.slice(0, 3);
  }

  private generateFacets(results: SearchIndex[]): Record<string, { value: string; count: number }[]> {
    const facets: Record<string, { value: string; count: number }[]> = {};

    // Type facets
    const typeCounts = results.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    facets.type = Object.entries(typeCounts).map(([value, count]) => ({ value, count }));

    // Category facets
    const categoryCounts = results.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    facets.category = Object.entries(categoryCounts).map(([value, count]) => ({ value, count }));

    // Tag facets
    const tagCounts = results.reduce((acc, item) => {
      item.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    facets.tags = Object.entries(tagCounts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return facets;
  }
}

export const searchService = new SearchService();