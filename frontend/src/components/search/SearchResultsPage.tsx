import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  FilterList,
  Sort,
  ViewList,
  ViewModule,
  Bookmark,
  Share,
  Download,
  ExpandMore,
  Clear,
  Search,
} from '@mui/icons-material';
import { GlobalSearch, SearchResult } from './GlobalSearch';
import { useSearch } from '../../hooks/useSearch';
import { searchService } from '../../services/searchService';

interface SearchResultsPageProps {
  initialQuery?: string;
  initialFilters?: Record<string, any>;
}

interface SearchFiltersProps {
  facets: Record<string, { value: string; count: number }[]>;
  selectedFilters: Record<string, string[]>;
  onFilterChange: (filterType: string, values: string[]) => void;
  onClearFilters: () => void;
}

interface SearchResultsListProps {
  results: SearchResult[];
  loading: boolean;
  viewMode: 'list' | 'grid';
  onResultClick: (result: SearchResult) => void;
  onSaveResult: (result: SearchResult) => void;
  onShareResult: (result: SearchResult) => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  facets,
  selectedFilters,
  onFilterChange,
  onClearFilters,
}) => {
  const hasActiveFilters = Object.values(selectedFilters).some(values => values.length > 0);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Filters</Typography>
          {hasActiveFilters && (
            <Button
              size="small"
              startIcon={<Clear />}
              onClick={onClearFilters}
            >
              Clear All
            </Button>
          )}
        </Box>

        {Object.entries(facets).map(([filterType, options]) => (
          <Accordion key={filterType} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                {selectedFilters[filterType]?.length > 0 && (
                  <Chip
                    label={selectedFilters[filterType].length}
                    size="small"
                    color="primary"
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {options.slice(0, 10).map((option) => (
                  <ListItem key={option.value} disablePadding>
                    <ListItemButton
                      selected={selectedFilters[filterType]?.includes(option.value)}
                      onClick={() => {
                        const currentValues = selectedFilters[filterType] || [];
                        const newValues = currentValues.includes(option.value)
                          ? currentValues.filter(v => v !== option.value)
                          : [...currentValues, option.value];
                        onFilterChange(filterType, newValues);
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2">{option.value}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.count}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))}
      </CardContent>
    </Card>
  );
};

const SearchResultsList: React.FC<SearchResultsListProps> = ({
  results,
  loading,
  viewMode,
  onResultClick,
  onSaveResult,
  onShareResult,
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <Typography>Loading results...</Typography>
      </Box>
    );
  }

  if (results.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Search sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No results found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Try adjusting your search terms or filters
        </Typography>
      </Box>
    );
  }

  if (viewMode === 'grid') {
    return (
      <Grid container spacing={2}>
        {results.map((result) => (
          <Grid item xs={12} sm={6} md={4} key={result.id}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: theme.shadows[4],
                },
              }}
              onClick={() => onResultClick(result)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip label={result.type} size="small" />
                  <Typography variant="caption" color="text.secondary">
                    {Math.round(result.relevanceScore * 100)}% match
                  </Typography>
                </Box>
                
                <Typography variant="h6" gutterBottom noWrap>
                  {result.title}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {result.description}
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {result.category}
                  </Typography>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSaveResult(result);
                      }}
                    >
                      <Bookmark />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShareResult(result);
                      }}
                    >
                      <Share />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <List>
      {results.map((result, index) => (
        <React.Fragment key={result.id}>
          <ListItem
            button
            onClick={() => onResultClick(result)}
            sx={{
              borderRadius: 1,
              mb: 1,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h6">{result.title}</Typography>
                  <Chip label={result.type} size="small" />
                  <Typography variant="caption" color="text.secondary">
                    {Math.round(result.relevanceScore * 100)}% match
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
                      {result.highlights.slice(0, 2).map((highlight, hIndex) => (
                        <Typography
                          key={hIndex}
                          variant="caption"
                          sx={{
                            display: 'block',
                            backgroundColor: theme.palette.warning.light,
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
            
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Save result">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveResult(result);
                  }}
                >
                  <Bookmark />
                </IconButton>
              </Tooltip>
              <Tooltip title="Share result">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShareResult(result);
                  }}
                >
                  <Share />
                </IconButton>
              </Tooltip>
            </Box>
          </ListItem>
          {index < results.length - 1 && <Divider />}
        </React.Fragment>
      ))}
    </List>
  );
};

export const SearchResultsPage: React.FC<SearchResultsPageProps> = ({
  initialQuery = '',
  initialFilters = {},
}) => {
  const {
    query,
    setQuery,
    results,
    loading,
    totalCount,
    facets,
    search,
    getSuggestions,
    saveSearch,
  } = useSearch({ autoSearch: false });

  const [selectedFilters, setSelectedFilters] = React.useState<Record<string, string[]>>(initialFilters);
  const [sortBy, setSortBy] = React.useState<'relevance' | 'date' | 'title'>('relevance');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

  React.useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (searchQuery: string = query) => {
    const searchParams = {
      query: searchQuery,
      filters: Object.keys(selectedFilters).length > 0 ? selectedFilters : undefined,
      sort: { field: sortBy, order: sortOrder },
      limit: pageSize,
      offset: (page - 1) * pageSize,
    };

    await search(searchParams);
  };

  const handleFilterChange = (filterType: string, values: string[]) => {
    const newFilters = { ...selectedFilters, [filterType]: values };
    if (values.length === 0) {
      delete newFilters[filterType];
    }
    setSelectedFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setSelectedFilters({});
    setPage(1);
  };

  const handleSortChange = (field: 'relevance' | 'date' | 'title') => {
    setSortBy(field);
    setPage(1);
  };

  const handleResultClick = (result: SearchResult) => {
    window.open(result.url, '_blank');
  };

  const handleSaveResult = (result: SearchResult) => {
    console.log('Save result:', result);
    // Implement save functionality
  };

  const handleShareResult = (result: SearchResult) => {
    if (navigator.share) {
      navigator.share({
        title: result.title,
        text: result.description,
        url: result.url,
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(result.url);
    }
  };

  const handleSaveSearch = () => {
    saveSearch(query, selectedFilters);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Search Header */}
      <Box sx={{ mb: 4 }}>
        <GlobalSearch
          onSearch={async (searchQuery) => {
            const response = await searchService.search({ query: searchQuery });
            return response.results;
          }}
          onSuggestions={getSuggestions}
          onSaveSearch={handleSaveSearch}
          placeholder="Search across all data..."
        />
      </Box>

      <Grid container spacing={3}>
        {/* Filters Sidebar */}
        <Grid item xs={12} md={3}>
          <SearchFilters
            facets={facets}
            selectedFilters={selectedFilters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
          />
        </Grid>

        {/* Results Area */}
        <Grid item xs={12} md={9}>
          {/* Results Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6">
              {totalCount > 0 ? `${totalCount.toLocaleString()} results` : 'Search Results'}
              {query && ` for "${query}"`}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Sort Controls */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Sort by</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as any)}
                >
                  <MenuItem value="relevance">Relevance</MenuItem>
                  <MenuItem value="date">Date</MenuItem>
                  <MenuItem value="title">Title</MenuItem>
                </Select>
              </FormControl>

              {/* View Mode Toggle */}
              <Box sx={{ display: 'flex', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => setViewMode('list')}
                  color={viewMode === 'list' ? 'primary' : 'default'}
                >
                  <ViewList />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => setViewMode('grid')}
                  color={viewMode === 'grid' ? 'primary' : 'default'}
                >
                  <ViewModule />
                </IconButton>
              </Box>

              {/* Export Button */}
              <Button startIcon={<Download />} variant="outlined" size="small">
                Export
              </Button>
            </Box>
          </Box>

          {/* Active Filters */}
          {Object.entries(selectedFilters).some(([_, values]) => values.length > 0) && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Active filters:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(selectedFilters).map(([filterType, values]) =>
                  values.map((value) => (
                    <Chip
                      key={`${filterType}-${value}`}
                      label={`${filterType}: ${value}`}
                      size="small"
                      onDelete={() => {
                        const newValues = values.filter(v => v !== value);
                        handleFilterChange(filterType, newValues);
                      }}
                    />
                  ))
                )}
              </Box>
            </Box>
          )}

          {/* Search Results */}
          <SearchResultsList
            results={results}
            loading={loading}
            viewMode={viewMode}
            onResultClick={handleResultClick}
            onSaveResult={handleSaveResult}
            onShareResult={handleShareResult}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};