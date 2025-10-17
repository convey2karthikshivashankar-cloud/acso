import { SearchAnalytics } from '../components/search/SearchResultManager';

export interface SearchEvent {
  id: string;
  userId: string;
  query: string;
  filters?: Record<string, any>;
  resultCount: number;
  clickedResults: string[];
  savedResults: string[];
  timestamp: Date;
  sessionId: string;
  source: 'global_search' | 'advanced_search' | 'filter_preset' | 'saved_search';
  duration: number; // in milliseconds
}

export interface SearchMetrics {
  totalSearches: number;
  uniqueUsers: number;
  averageSessionDuration: number;
  searchSuccessRate: number; // percentage of searches that resulted in clicks
  popularFilters: { filter: string; usage: number }[];
  peakSearchTimes: { hour: number; searches: number }[];
  searchConversionRate: number; // percentage of searches that resulted in saves
}

export interface QueryAnalysis {
  query: string;
  frequency: number;
  averageResults: number;
  averageRelevance: number;
  clickThroughRate: number;
  saveRate: number;
  relatedQueries: string[];
  suggestedImprovements: string[];
}

class SearchAnalyticsService {
  private searchEvents: SearchEvent[] = [];
  private searchMetrics: SearchMetrics | null = null;

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Generate mock search events for the last 30 days
    const users = ['user1', 'user2', 'user3', 'user4', 'user5'];
    const queries = [
      'security incidents',
      'agent configuration',
      'cost analysis',
      'workflow templates',
      'dashboard metrics',
      'threat detection',
      'budget reports',
      'system alerts',
      'performance monitoring',
      'user management',
    ];
    const sources: SearchEvent['source'][] = ['global_search', 'advanced_search', 'filter_preset', 'saved_search'];

    for (let i = 0; i < 1000; i++) {
      const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const userId = users[Math.floor(Math.random() * users.length)];
      const query = queries[Math.floor(Math.random() * queries.length)];
      const resultCount = Math.floor(Math.random() * 50) + 1;
      const clickedCount = Math.floor(Math.random() * Math.min(resultCount, 5));
      const savedCount = Math.floor(Math.random() * clickedCount);

      this.searchEvents.push({
        id: `event-${i}`,
        userId,
        query,
        resultCount,
        clickedResults: Array.from({ length: clickedCount }, (_, j) => `result-${j}`),
        savedResults: Array.from({ length: savedCount }, (_, j) => `result-${j}`),
        timestamp,
        sessionId: `session-${Math.floor(i / 10)}`,
        source: sources[Math.floor(Math.random() * sources.length)],
        duration: Math.floor(Math.random() * 30000) + 1000,
      });
    }
  }

  async getSearchAnalytics(): Promise<SearchAnalytics> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const totalSearches = this.searchEvents.length;
    const uniqueQueries = new Set(this.searchEvents.map(e => e.query)).size;
    const averageResultsPerSearch = this.searchEvents.reduce((sum, e) => sum + e.resultCount, 0) / totalSearches;

    // Calculate top queries
    const queryCount = this.searchEvents.reduce((acc, event) => {
      acc[event.query] = (acc[event.query] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const queryRelevance = this.searchEvents.reduce((acc, event) => {
      if (!acc[event.query]) {
        acc[event.query] = { total: 0, count: 0 };
      }
      acc[event.query].total += Math.random() * 0.4 + 0.6; // Mock relevance score
      acc[event.query].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    const topQueries = Object.entries(queryCount)
      .map(([query, count]) => ({
        query,
        count,
        avgRelevance: queryRelevance[query].total / queryRelevance[query].count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate top result types (mock data)
    const resultTypes = [
      { type: 'incident', count: 450, percentage: 35.2 },
      { type: 'agent', count: 320, percentage: 25.0 },
      { type: 'workflow', count: 280, percentage: 21.9 },
      { type: 'dashboard', count: 150, percentage: 11.7 },
      { type: 'document', count: 80, percentage: 6.2 },
    ];

    // Calculate search trends
    const searchTrends = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayEvents = this.searchEvents.filter(e => 
        e.timestamp.toDateString() === date.toDateString()
      );
      return {
        date,
        searches: dayEvents.length,
        results: dayEvents.reduce((sum, e) => sum + e.resultCount, 0),
      };
    }).reverse();

    // Calculate user activity
    const userActivity = Object.entries(
      this.searchEvents.reduce((acc, event) => {
        if (!acc[event.userId]) {
          acc[event.userId] = { searches: 0, saves: 0 };
        }
        acc[event.userId].searches += 1;
        acc[event.userId].saves += event.savedResults.length;
        return acc;
      }, {} as Record<string, { searches: number; saves: number }>)
    )
      .map(([userId, stats]) => ({ userId, ...stats }))
      .sort((a, b) => b.searches - a.searches)
      .slice(0, 10);

    return {
      totalSearches,
      uniqueQueries,
      averageResultsPerSearch,
      topQueries,
      topResultTypes: resultTypes,
      searchTrends,
      userActivity,
    };
  }

  async getSearchMetrics(): Promise<SearchMetrics> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const totalSearches = this.searchEvents.length;
    const uniqueUsers = new Set(this.searchEvents.map(e => e.userId)).size;
    const averageSessionDuration = this.searchEvents.reduce((sum, e) => sum + e.duration, 0) / totalSearches;
    
    const searchesWithClicks = this.searchEvents.filter(e => e.clickedResults.length > 0).length;
    const searchSuccessRate = (searchesWithClicks / totalSearches) * 100;
    
    const searchesWithSaves = this.searchEvents.filter(e => e.savedResults.length > 0).length;
    const searchConversionRate = (searchesWithSaves / totalSearches) * 100;

    // Mock popular filters
    const popularFilters = [
      { filter: 'type:incident', usage: 245 },
      { filter: 'severity:high', usage: 189 },
      { filter: 'status:active', usage: 156 },
      { filter: 'category:security', usage: 134 },
      { filter: 'date:last_week', usage: 98 },
    ];

    // Calculate peak search times
    const hourlySearches = this.searchEvents.reduce((acc, event) => {
      const hour = event.timestamp.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const peakSearchTimes = Object.entries(hourlySearches)
      .map(([hour, searches]) => ({ hour: parseInt(hour), searches }))
      .sort((a, b) => b.searches - a.searches);

    return {
      totalSearches,
      uniqueUsers,
      averageSessionDuration,
      searchSuccessRate,
      popularFilters,
      peakSearchTimes,
      searchConversionRate,
    };
  }

  async analyzeQuery(query: string): Promise<QueryAnalysis> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));

    const queryEvents = this.searchEvents.filter(e => e.query.toLowerCase() === query.toLowerCase());
    
    if (queryEvents.length === 0) {
      return {
        query,
        frequency: 0,
        averageResults: 0,
        averageRelevance: 0,
        clickThroughRate: 0,
        saveRate: 0,
        relatedQueries: [],
        suggestedImprovements: [],
      };
    }

    const frequency = queryEvents.length;
    const averageResults = queryEvents.reduce((sum, e) => sum + e.resultCount, 0) / frequency;
    const averageRelevance = Math.random() * 0.4 + 0.6; // Mock relevance
    
    const eventsWithClicks = queryEvents.filter(e => e.clickedResults.length > 0).length;
    const clickThroughRate = (eventsWithClicks / frequency) * 100;
    
    const eventsWithSaves = queryEvents.filter(e => e.savedResults.length > 0).length;
    const saveRate = (eventsWithSaves / frequency) * 100;

    // Find related queries (queries from same users)
    const userIds = new Set(queryEvents.map(e => e.userId));
    const relatedQueries = [...new Set(
      this.searchEvents
        .filter(e => userIds.has(e.userId) && e.query !== query)
        .map(e => e.query)
    )].slice(0, 5);

    // Generate suggested improvements
    const suggestedImprovements = [];
    if (averageRelevance < 0.7) {
      suggestedImprovements.push('Consider improving search indexing for better relevance');
    }
    if (clickThroughRate < 30) {
      suggestedImprovements.push('Results may not match user intent - review result ranking');
    }
    if (saveRate < 10) {
      suggestedImprovements.push('Users rarely save results - consider result quality');
    }
    if (averageResults < 5) {
      suggestedImprovements.push('Low result count - expand search scope or improve indexing');
    }

    return {
      query,
      frequency,
      averageResults,
      averageRelevance,
      clickThroughRate,
      saveRate,
      relatedQueries,
      suggestedImprovements,
    };
  }

  async trackSearchEvent(event: Omit<SearchEvent, 'id' | 'timestamp'>): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const searchEvent: SearchEvent = {
      ...event,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    this.searchEvents.push(searchEvent);

    // In a real implementation, this would send to analytics backend
    console.log('Search event tracked:', searchEvent);
  }

  async getSearchTrends(period: 'day' | 'week' | 'month' | 'year'): Promise<{
    labels: string[];
    searches: number[];
    results: number[];
    saves: number[];
  }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    let days: number;
    let groupBy: 'hour' | 'day' | 'week' | 'month';

    switch (period) {
      case 'day':
        days = 1;
        groupBy = 'hour';
        break;
      case 'week':
        days = 7;
        groupBy = 'day';
        break;
      case 'month':
        days = 30;
        groupBy = 'day';
        break;
      case 'year':
        days = 365;
        groupBy = 'month';
        break;
    }

    const trends = Array.from({ length: groupBy === 'hour' ? 24 : days }, (_, i) => {
      let date: Date;
      let label: string;

      if (groupBy === 'hour') {
        date = new Date();
        date.setHours(i, 0, 0, 0);
        label = `${i}:00`;
      } else {
        date = new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000);
        label = date.toLocaleDateString();
      }

      const dayEvents = this.searchEvents.filter(e => {
        if (groupBy === 'hour') {
          return e.timestamp.getHours() === i && 
                 e.timestamp.toDateString() === new Date().toDateString();
        } else {
          return e.timestamp.toDateString() === date.toDateString();
        }
      });

      return {
        label,
        searches: dayEvents.length,
        results: dayEvents.reduce((sum, e) => sum + e.resultCount, 0),
        saves: dayEvents.reduce((sum, e) => sum + e.savedResults.length, 0),
      };
    });

    return {
      labels: trends.map(t => t.label),
      searches: trends.map(t => t.searches),
      results: trends.map(t => t.results),
      saves: trends.map(t => t.saves),
    };
  }

  async getPopularSearchTerms(limit: number = 20): Promise<{
    term: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
    trendPercentage: number;
  }[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Extract individual terms from queries
    const terms = this.searchEvents
      .flatMap(e => e.query.toLowerCase().split(/\s+/))
      .filter(term => term.length > 2); // Filter out short words

    const termCounts = terms.reduce((acc, term) => {
      acc[term] = (acc[term] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(termCounts)
      .map(([term, count]) => ({
        term,
        count,
        trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable' as const,
        trendPercentage: Math.floor(Math.random() * 50) + 1,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async exportAnalytics(format: 'csv' | 'json' | 'excel'): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const analytics = await this.getSearchAnalytics();
    const metrics = await this.getSearchMetrics();

    const data = {
      analytics,
      metrics,
      events: this.searchEvents.slice(0, 100), // Limit for demo
      exportedAt: new Date().toISOString(),
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        // Simple CSV format for top queries
        const csvRows = [
          'Query,Count,Average Relevance',
          ...analytics.topQueries.map(q => `"${q.query}",${q.count},${q.avgRelevance.toFixed(2)}`)
        ];
        return csvRows.join('\n');
      case 'excel':
        // In a real implementation, this would generate an Excel file
        return 'Excel export not implemented in demo';
      default:
        throw new Error('Unsupported format');
    }
  }
}

export const searchAnalyticsService = new SearchAnalyticsService();