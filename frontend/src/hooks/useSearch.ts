import React from 'react';
import { searchService, SearchQuery } from '../services/searchService';
import { SearchResult, SearchSuggestion } from '../components/search/GlobalSearch';

export interface UseSearchOptions {
  debounceMs?: number;
  autoSearch?: boolean;
  cacheResults?: boolean;
}

export interface UseSearchReturn {
  // Search state
  query: string;
  results: SearchResult[];
  suggestions: SearchSuggestion[];
  loading: boolean;
  suggestionsLoading: boolean;
  error: string | null;
  totalCount: number;
  facets: Record<string, { value: string; count: number }[]>;
  
  // Search actions
  setQuery: (query: string) => void;
  search: (searchQuery?: SearchQuery) => Promise<void>;
  getSuggestions: (query: string) => Promise<void>;
  clearResults: () => void;
  clearError: () => void;
  
  // Search history
  searchHistory: string[];
  addToHistory: (query: string) => void;
  clearHistory: () => void;
  
  // Saved searches
  savedSearches: { id: string; query: string; filters?: any }[];
  saveSearch: (query: string, filters?: any) => void;
  removeSavedSearch: (id: string) => void;
}

export const useSearch = (options: UseSearchOptions = {}): UseSearchReturn => {
  const {
    debounceMs = 300,
    autoSearch = false,
    cacheResults = true,
  } = options;

  // State
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = React.useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [totalCount, setTotalCount] = React.useState(0);
  const [facets, setFacets] = React.useState<Record<string, { value: string; count: number }[]>>({});
  const [searchHistory, setSearchHistory] = React.useState<string[]>([]);
  const [savedSearches, setSavedSearches] = React.useState<{ id: string; query: string; filters?: any }[]>([]);

  // Cache
  const resultsCache = React.useRef<Map<string, { results: SearchResult[]; totalCount: number; facets: any; timestamp: number }>>(new Map());
  const suggestionsCache = React.useRef<Map<string, { suggestions: SearchSuggestion[]; timestamp: number }>>(new Map());

  // Timeouts
  const searchTimeoutRef = React.useRef<NodeJS.Timeout>();
  const suggestionsTimeoutRef = React.useRef<NodeJS.Timeout>();

  // Load saved data from localStorage
  React.useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('searchHistory');
      if (savedHistory) {
        setSearchHistory(JSON.parse(savedHistory));
      }

      const savedSearchesData = localStorage.getItem('savedSearches');
      if (savedSearchesData) {
        setSavedSearches(JSON.parse(savedSearchesData));
      }
    } catch (error) {
      console.error('Failed to load search data from localStorage:', error);
    }
  }, []);

  // Save search history to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  }, [searchHistory]);

  // Save saved searches to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem('savedSearches', JSON.stringify(savedSearches));
    } catch (error) {
      console.error('Failed to save searches:', error);
    }
  }, [savedSearches]);

  // Auto search when query changes
  React.useEffect(() => {
    if (autoSearch && query.trim().length > 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        search({ query: query.trim() });
      }, debounceMs);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, autoSearch, debounceMs]);

  const search = React.useCallback(async (searchQuery?: SearchQuery) => {
    const finalQuery = searchQuery || { query: query.trim() };
    
    if (!finalQuery.query.trim()) {
      setResults([]);
      setTotalCount(0);
      setFacets({});
      return;
    }

    const cacheKey = JSON.stringify(finalQuery);
    
    // Check cache first
    if (cacheResults && resultsCache.current.has(cacheKey)) {
      const cached = resultsCache.current.get(cacheKey)!;
      const isExpired = Date.now() - cached.timestamp > 5 * 60 * 1000; // 5 minutes
      
      if (!isExpired) {
        setResults(cached.results);
        setTotalCount(cached.totalCount);
        setFacets(cached.facets);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await searchService.search(finalQuery);
      
      setResults(response.results);
      setTotalCount(response.totalCount);
      setFacets(response.facets);
      
      // Cache results
      if (cacheResults) {
        resultsCache.current.set(cacheKey, {
          results: response.results,
          totalCount: response.totalCount,
          facets: response.facets,
          timestamp: Date.now(),
        });
        
        // Limit cache size
        if (resultsCache.current.size > 50) {
          const firstKey = resultsCache.current.keys().next().value;
          resultsCache.current.delete(firstKey);
        }
      }
      
      // Add to search history
      addToHistory(finalQuery.query);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
      setTotalCount(0);
      setFacets({});
    } finally {
      setLoading(false);
    }
  }, [query, cacheResults]);

  const getSuggestions = React.useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const cacheKey = searchQuery.trim().toLowerCase();
    
    // Check cache first
    if (suggestionsCache.current.has(cacheKey)) {
      const cached = suggestionsCache.current.get(cacheKey)!;
      const isExpired = Date.now() - cached.timestamp > 2 * 60 * 1000; // 2 minutes
      
      if (!isExpired) {
        setSuggestions(cached.suggestions);
        return;
      }
    }

    // Clear previous timeout
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current);
    }

    // Debounce suggestions
    suggestionsTimeoutRef.current = setTimeout(async () => {
      setSuggestionsLoading(true);
      
      try {
        const newSuggestions = await searchService.getSuggestions(searchQuery.trim());
        setSuggestions(newSuggestions);
        
        // Cache suggestions
        suggestionsCache.current.set(cacheKey, {
          suggestions: newSuggestions,
          timestamp: Date.now(),
        });
        
        // Limit cache size
        if (suggestionsCache.current.size > 100) {
          const firstKey = suggestionsCache.current.keys().next().value;
          suggestionsCache.current.delete(firstKey);
        }
        
      } catch (err) {
        console.error('Failed to get suggestions:', err);
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, debounceMs);
  }, [debounceMs]);

  const clearResults = React.useCallback(() => {
    setResults([]);
    setTotalCount(0);
    setFacets({});
    setError(null);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const addToHistory = React.useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item !== searchQuery.trim());
      return [searchQuery.trim(), ...filtered].slice(0, 20);
    });
  }, []);

  const clearHistory = React.useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem('searchHistory');
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  }, []);

  const saveSearch = React.useCallback((searchQuery: string, filters?: any) => {
    const newSavedSearch = {
      id: Date.now().toString(),
      query: searchQuery,
      filters,
    };
    
    setSavedSearches(prev => [newSavedSearch, ...prev].slice(0, 50));
    
    // Also save to backend
    searchService.saveSearch(searchQuery, filters).catch(error => {
      console.error('Failed to save search to backend:', error);
    });
  }, []);

  const removeSavedSearch = React.useCallback((id: string) => {
    setSavedSearches(prev => prev.filter(search => search.id !== id));
  }, []);

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (suggestionsTimeoutRef.current) {
        clearTimeout(suggestionsTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Search state
    query,
    results,
    suggestions,
    loading,
    suggestionsLoading,
    error,
    totalCount,
    facets,
    
    // Search actions
    setQuery,
    search,
    getSuggestions,
    clearResults,
    clearError,
    
    // Search history
    searchHistory,
    addToHistory,
    clearHistory,
    
    // Saved searches
    savedSearches,
    saveSearch,
    removeSavedSearch,
  };
};