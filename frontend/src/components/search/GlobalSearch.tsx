import React from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Typography,
  Chip,
  Divider,
  Button,
  Autocomplete,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search,
  Clear,
  History,
  TrendingUp,
  FilterList,
  BookmarkBorder,
  Bookmark,
  Share,
  MoreVert,
  Description,
  Person,
  Security,
  Assessment,
  Timeline,
  AttachMoney,
} from '@mui/icons-material';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'incident' | 'agent' | 'workflow' | 'dashboard' | 'user' | 'document' | 'financial';
  category: string;
  url: string;
  relevanceScore: number;
  highlights: {
    field: string;
    snippet: string;
  }[];
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'query' | 'filter' | 'entity';
  category?: string;
  count?: number;
}

export interface SearchHistory {
  id: string;
  query: string;
  timestamp: Date;
  resultCount: number;
  filters?: Record<string, any>;
}

interface GlobalSearchProps {
  onSearch?: (query: string, filters?: Record<string, any>) => Promise<SearchResult[]>;
  onSuggestions?: (query: string) => Promise<SearchSuggestion[]>;
  onSaveSearch?: (query: string, filters?: Record<string, any>) => void;
  searchHistory?: SearchHistory[];
  placeholder?: string;
  autoFocus?: boolean;
}

interface SearchResultItemProps {
  result: SearchResult;
  onSelect: (result: SearchResult) => void;
  onSave?: (result: SearchResult) => void;
  onShare?: (result: SearchResult) => void;
}

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  onSelect: (suggestion: SearchSuggestion) => void;
  loading: boolean;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({
  result,
  onSelect,
  onSave,
  onShare,
}) => {
  const theme = useTheme();

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'incident':
        return <Security />;
      case 'agent':
        return <Person />;
      case 'workflow':
        return <Timeline />;
      case 'dashboard':
        return <Assessment />;
      case 'document':
        return <Description />;
      case 'financial':
        return <AttachMoney />;
      default:
        return <Description />;
    }
  };

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'incident':
        return theme.palette.error.main;
      case 'agent':
        return theme.palette.info.main;
      case 'workflow':
        return theme.palette.success.main;
      case 'dashboard':
        return theme.palette.primary.main;
      case 'document':
        return theme.palette.grey[600];
      case 'financial':
        return theme.palette.warning.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const formatRelevanceScore = (score: number) => {
    return `${Math.round(score * 100)}% match`;
  };

  return (
    <ListItem
      button
      onClick={() => onSelect(result)}
      sx={{
        borderLeft: `4px solid ${getTypeColor(result.type)}`,
        mb: 1,
        borderRadius: 1,
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.04),
        },
      }}
    >
      <ListItemIcon>
        <Box sx={{ color: getTypeColor(result.type) }}>
          {getTypeIcon(result.type)}
        </Box>
      </ListItemIcon>
      
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1" fontWeight="medium">
              {result.title}
            </Typography>
            <Chip
              label={result.type}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
            <Typography variant="caption" color="text.secondary">
              {formatRelevanceScore(result.relevanceScore)}
            </Typography>
          </Box>
        }
        secondary={
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {result.description}
            </Typography>
            
            {result.highlights.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {result.highlights.slice(0, 2).map((highlight, index) => (
                  <Typography
                    key={index}
                    variant="caption"
                    sx={{
                      display: 'block',
                      backgroundColor: alpha(theme.palette.warning.main, 0.1),
                      p: 0.5,
                      borderRadius: 0.5,
                      mb: 0.5,
                      fontFamily: 'monospace',
                    }}
                    dangerouslySetInnerHTML={{ __html: highlight.snippet }}
                  />
                ))}
              </Box>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {result.category}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                •
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {result.timestamp.toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
        }
      />
      
      <ListItemSecondaryAction>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {onSave && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onSave(result);
              }}
            >
              <BookmarkBorder />
            </IconButton>
          )}
          {onShare && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onShare(result);
              }}
            >
              <Share />
            </IconButton>
          )}
        </Box>
      </ListItemSecondaryAction>
    </ListItem>
  );
};

const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  suggestions,
  onSelect,
  loading,
}) => {
  const theme = useTheme();

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'query':
        return <Search />;
      case 'filter':
        return <FilterList />;
      case 'entity':
        return <TrendingUp />;
      default:
        return <Search />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No suggestions found
        </Typography>
      </Box>
    );
  }

  const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.type]) {
      acc[suggestion.type] = [];
    }
    acc[suggestion.type].push(suggestion);
    return acc;
  }, {} as Record<string, SearchSuggestion[]>);

  return (
    <Box>
      {Object.entries(groupedSuggestions).map(([type, typeSuggestions], index) => (
        <Box key={type}>
          {index > 0 && <Divider />}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ p: 1, display: 'block', fontWeight: 'bold' }}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}s
          </Typography>
          {typeSuggestions.map((suggestion) => (
            <ListItem
              key={suggestion.id}
              button
              onClick={() => onSelect(suggestion)}
              dense
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {getSuggestionIcon(suggestion.type)}
              </ListItemIcon>
              <ListItemText
                primary={suggestion.text}
                secondary={suggestion.category}
              />
              {suggestion.count && (
                <ListItemSecondaryAction>
                  <Typography variant="caption" color="text.secondary">
                    {suggestion.count}
                  </Typography>
                </ListItemSecondaryAction>
              )}
            </ListItem>
          ))}
        </Box>
      ))}
    </Box>
  );
};

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  onSearch,
  onSuggestions,
  onSaveSearch,
  searchHistory = [],
  placeholder = "Search across all data...",
  autoFocus = false,
}) => {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = React.useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = React.useState(false);
  const [showResults, setShowResults] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<SearchHistory[]>(searchHistory);

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const suggestionsTimeoutRef = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    if (autoFocus && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim() || !onSearch) return;

    setLoading(true);
    setShowSuggestions(false);
    
    try {
      const searchResults = await onSearch(searchQuery.trim());
      setResults(searchResults);
      setShowResults(true);
      
      // Add to search history
      const historyItem: SearchHistory = {
        id: Date.now().toString(),
        query: searchQuery.trim(),
        timestamp: new Date(),
        resultCount: searchResults.length,
      };
      setRecentSearches(prev => [historyItem, ...prev.slice(0, 9)]);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    
    if (value.trim().length > 2 && onSuggestions) {
      // Clear previous timeout
      if (suggestionsTimeoutRef.current) {
        clearTimeout(suggestionsTimeoutRef.current);
      }
      
      // Debounce suggestions
      suggestionsTimeoutRef.current = setTimeout(async () => {
        setSuggestionsLoading(true);
        try {
          const newSuggestions = await onSuggestions(value.trim());
          setSuggestions(newSuggestions);
          setShowSuggestions(true);
          setShowResults(false);
        } catch (error) {
          console.error('Suggestions failed:', error);
          setSuggestions([]);
        } finally {
          setSuggestionsLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      if (value.trim().length === 0) {
        setShowResults(false);
      }
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    } else if (event.key === 'Escape') {
      setShowResults(false);
      setShowSuggestions(false);
      searchInputRef.current?.blur();
    }
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'query') {
      setQuery(suggestion.text);
      handleSearch(suggestion.text);
    } else if (suggestion.type === 'filter') {
      // Handle filter suggestion
      setQuery(prev => `${prev} ${suggestion.text}`);
    } else {
      setQuery(suggestion.text);
      handleSearch(suggestion.text);
    }
    setShowSuggestions(false);
  };

  const handleResultSelect = (result: SearchResult) => {
    // Navigate to result URL
    window.open(result.url, '_blank');
    setShowResults(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setShowResults(false);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  const handleHistorySelect = (historyItem: SearchHistory) => {
    setQuery(historyItem.query);
    handleSearch(historyItem.query);
  };

  const showDropdown = showResults || showSuggestions || (query.length === 0 && recentSearches.length > 0);

  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 600 }}>
      {/* Search Input */}
      <TextField
        ref={searchInputRef}
        fullWidth
        placeholder={placeholder}
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyPress={handleKeyPress}
        onFocus={() => {
          if (query.length === 0 && recentSearches.length > 0) {
            setShowSuggestions(true);
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {loading && <CircularProgress size={20} />}
              {query && (
                <IconButton size="small" onClick={handleClear}>
                  <Clear />
                </IconButton>
              )}
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
          },
        }}
      />

      {/* Search Dropdown */}
      {showDropdown && (
        <Paper
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1300,
            maxHeight: 400,
            overflow: 'auto',
            mt: 1,
            boxShadow: 3,
          }}
        >
          {/* Search Results */}
          {showResults && (
            <Box>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2">
                  Search Results ({results.length})
                </Typography>
                {onSaveSearch && (
                  <Button
                    size="small"
                    startIcon={<Bookmark />}
                    onClick={() => onSaveSearch(query)}
                    sx={{ mt: 1 }}
                  >
                    Save Search
                  </Button>
                )}
              </Box>
              
              <List sx={{ p: 1 }}>
                {results.slice(0, 10).map((result) => (
                  <SearchResultItem
                    key={result.id}
                    result={result}
                    onSelect={handleResultSelect}
                    onSave={(result) => console.log('Save result:', result)}
                    onShare={(result) => console.log('Share result:', result)}
                  />
                ))}
              </List>
              
              {results.length > 10 && (
                <Box sx={{ p: 2, textAlign: 'center', borderTop: 1, borderColor: 'divider' }}>
                  <Button variant="outlined" size="small">
                    View All {results.length} Results
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <Box>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2">Suggestions</Typography>
              </Box>
              <SearchSuggestions
                suggestions={suggestions}
                onSelect={handleSuggestionSelect}
                loading={suggestionsLoading}
              />
            </Box>
          )}

          {/* Recent Searches */}
          {query.length === 0 && recentSearches.length > 0 && (
            <Box>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2">Recent Searches</Typography>
              </Box>
              <List>
                {recentSearches.slice(0, 5).map((historyItem) => (
                  <ListItem
                    key={historyItem.id}
                    button
                    onClick={() => handleHistorySelect(historyItem)}
                  >
                    <ListItemIcon>
                      <History />
                    </ListItemIcon>
                    <ListItemText
                      primary={historyItem.query}
                      secondary={`${historyItem.resultCount} results • ${historyItem.timestamp.toLocaleDateString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Empty State */}
          {showResults && results.length === 0 && !loading && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No results found for "{query}"
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your search terms or using different keywords
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};