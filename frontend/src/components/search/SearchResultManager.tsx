import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Star,
  StarBorder,
  Share,
  Download,
  Delete,
  Edit,
  Visibility,
  Sort,
  FilterList,
  Category,
  TrendingUp,
  Assessment,
  Timeline,
  Bookmark,
  BookmarkBorder,
  Group,
  Public,
  Lock,
  Analytics,
} from '@mui/icons-material';
import { SearchResult } from './GlobalSearch';

export interface SavedSearchResult {
  id: string;
  searchResult: SearchResult;
  savedAt: Date;
  savedBy: string;
  tags: string[];
  notes: string;
  isStarred: boolean;
  category: string;
  isShared: boolean;
  sharedWith: string[];
}

export interface SearchResultCollection {
  id: string;
  name: string;
  description: string;
  results: SavedSearchResult[];
  createdBy: string;
  createdAt: Date;
  isPublic: boolean;
  tags: string[];
  collaborators: string[];
}

export interface SearchAnalytics {
  totalSearches: number;
  uniqueQueries: number;
  averageResultsPerSearch: number;
  topQueries: { query: string; count: number; avgRelevance: number }[];
  topResultTypes: { type: string; count: number; percentage: number }[];
  searchTrends: { date: Date; searches: number; results: number }[];
  userActivity: { userId: string; searches: number; saves: number }[];
}

interface SearchResultManagerProps {
  savedResults: SavedSearchResult[];
  collections: SearchResultCollection[];
  analytics: SearchAnalytics;
  onSaveResult?: (result: SearchResult, metadata: { tags: string[]; notes: string; category: string }) => void;
  onDeleteResult?: (resultId: string) => void;
  onStarResult?: (resultId: string, starred: boolean) => void;
  onShareResult?: (resultId: string, userIds: string[]) => void;
  onCreateCollection?: (collection: Omit<SearchResultCollection, 'id' | 'createdAt'>) => void;
  onExportResults?: (resultIds: string[], format: 'csv' | 'json' | 'pdf') => void;
}

interface SavedResultsListProps {
  results: SavedSearchResult[];
  onStar: (resultId: string, starred: boolean) => void;
  onDelete: (resultId: string) => void;
  onShare: (resultId: string) => void;
  onEdit: (result: SavedSearchResult) => void;
}

interface CollectionsManagerProps {
  collections: SearchResultCollection[];
  onCreateCollection: (collection: Omit<SearchResultCollection, 'id' | 'createdAt'>) => void;
  onDeleteCollection: (collectionId: string) => void;
  onEditCollection: (collection: SearchResultCollection) => void;
}

interface SearchAnalyticsProps {
  analytics: SearchAnalytics;
}

const SavedResultsList: React.FC<SavedResultsListProps> = ({
  results,
  onStar,
  onDelete,
  onShare,
  onEdit,
}) => {
  const theme = useTheme();
  const [sortBy, setSortBy] = React.useState<'date' | 'relevance' | 'title'>('date');
  const [filterCategory, setFilterCategory] = React.useState<string>('all');
  const [filterStarred, setFilterStarred] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);

  const categories = React.useMemo(() => {
    const cats = new Set(results.map(r => r.category));
    return Array.from(cats);
  }, [results]);

  const filteredResults = React.useMemo(() => {
    let filtered = [...results];

    if (filterCategory !== 'all') {
      filtered = filtered.filter(r => r.category === filterCategory);
    }

    if (filterStarred) {
      filtered = filtered.filter(r => r.isStarred);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.savedAt.getTime() - a.savedAt.getTime();
        case 'relevance':
          return b.searchResult.relevanceScore - a.searchResult.relevanceScore;
        case 'title':
          return a.searchResult.title.localeCompare(b.searchResult.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [results, sortBy, filterCategory, filterStarred]);

  const paginatedResults = filteredResults.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'incident':
        return <Assessment color="error" />;
      case 'agent':
        return <Group color="info" />;
      case 'workflow':
        return <Timeline color="success" />;
      default:
        return <Visibility />;
    }
  };

  return (
    <Box>
      {/* Filters and Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <MenuItem value="date">Date Saved</MenuItem>
            <MenuItem value="relevance">Relevance</MenuItem>
            <MenuItem value="title">Title</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <MenuItem value="all">All Categories</MenuItem>
            {categories.map(category => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant={filterStarred ? 'contained' : 'outlined'}
          startIcon={<Star />}
          onClick={() => setFilterStarred(!filterStarred)}
          size="small"
        >
          Starred Only
        </Button>

        <Box sx={{ flex: 1 }} />

        <Typography variant="body2" color="text.secondary">
          {filteredResults.length} results
        </Typography>
      </Box>

      {/* Results Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={50}></TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Saved Date</TableCell>
              <TableCell>Relevance</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedResults.map((savedResult) => (
              <TableRow key={savedResult.id} hover>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => onStar(savedResult.id, !savedResult.isStarred)}
                  >
                    {savedResult.isStarred ? <Star color="warning" /> : <StarBorder />}
                  </IconButton>
                </TableCell>
                
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {savedResult.searchResult.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {savedResult.searchResult.description.substring(0, 100)}...
                    </Typography>
                    {savedResult.tags.length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        {savedResult.tags.slice(0, 3).map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{ mr: 0.5, fontSize: '0.7rem', height: 20 }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getTypeIcon(savedResult.searchResult.type)}
                    <Typography variant="body2">
                      {savedResult.searchResult.type}
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Chip label={savedResult.category} size="small" />
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {savedResult.savedAt.toLocaleDateString()}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {Math.round(savedResult.searchResult.relevanceScore * 100)}%
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => onEdit(savedResult)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Share">
                      <IconButton size="small" onClick={() => onShare(savedResult.id)}>
                        <Share />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => onDelete(savedResult.id)} color="error">
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredResults.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Box>
  );
};

const CollectionsManager: React.FC<CollectionsManagerProps> = ({
  collections,
  onCreateCollection,
  onDeleteCollection,
  onEditCollection,
}) => {
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [collectionName, setCollectionName] = React.useState('');
  const [collectionDescription, setCollectionDescription] = React.useState('');
  const [collectionTags, setCollectionTags] = React.useState('');
  const [isPublic, setIsPublic] = React.useState(false);

  const handleCreateCollection = () => {
    if (collectionName.trim()) {
      onCreateCollection({
        name: collectionName,
        description: collectionDescription,
        results: [],
        createdBy: 'current-user',
        isPublic,
        tags: collectionTags.split(',').map(tag => tag.trim()).filter(tag => tag),
        collaborators: [],
      });
      
      setCreateDialogOpen(false);
      setCollectionName('');
      setCollectionDescription('');
      setCollectionTags('');
      setIsPublic(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">Collections</Typography>
        <Button
          variant="contained"
          startIcon={<Bookmark />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Collection
        </Button>
      </Box>

      <Grid container spacing={3}>
        {collections.map((collection) => (
          <Grid item xs={12} sm={6} md={4} key={collection.id}>
            <Card>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">{collection.name}</Typography>
                    {collection.isPublic ? <Public fontSize="small" /> : <Lock fontSize="small" />}
                  </Box>
                }
                subheader={`${collection.results.length} results`}
                action={
                  <IconButton onClick={() => onDeleteCollection(collection.id)} color="error">
                    <Delete />
                  </IconButton>
                }
              />
              
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {collection.description}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Created by {collection.createdBy}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    • {collection.createdAt.toLocaleDateString()}
                  </Typography>
                </Box>
                
                {collection.tags.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {collection.tags.slice(0, 3).map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                )}
                
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button size="small" onClick={() => onEditCollection(collection)}>
                    Edit
                  </Button>
                  <Button size="small" startIcon={<Share />}>
                    Share
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {collections.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Bookmark sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No collections yet
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Create collections to organize your saved search results
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Bookmark />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ mt: 2 }}
          >
            Create First Collection
          </Button>
        </Box>
      )}

      {/* Create Collection Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Collection</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Collection Name"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={collectionDescription}
                onChange={(e) => setCollectionDescription(e.target.value)}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tags"
                value={collectionTags}
                onChange={(e) => setCollectionTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
                helperText="Separate tags with commas"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <Typography variant="body2">Make this collection public</Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateCollection}
            variant="contained"
            disabled={!collectionName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const SearchAnalytics: React.FC<SearchAnalyticsProps> = ({ analytics }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Search Analytics
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {analytics.totalSearches.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Searches
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {analytics.uniqueQueries.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Unique Queries
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="info.main" fontWeight="bold">
                {analytics.averageResultsPerSearch.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Results per Search
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {analytics.topQueries.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Popular Queries
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Top Queries */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Top Search Queries" />
            <CardContent>
              <List>
                {analytics.topQueries.slice(0, 10).map((query, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={query.query}
                      secondary={`${query.count} searches • ${Math.round(query.avgRelevance * 100)}% avg relevance`}
                    />
                    <ListItemSecondaryAction>
                      <Chip label={`#${index + 1}`} size="small" />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Result Types */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Result Types Distribution" />
            <CardContent>
              <List>
                {analytics.topResultTypes.map((type, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={type.type.charAt(0).toUpperCase() + type.type.slice(1)}
                      secondary={`${type.count} results`}
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="body2" color="text.secondary">
                        {type.percentage.toFixed(1)}%
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* User Activity */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Top Users by Activity" />
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell align="right">Searches</TableCell>
                      <TableCell align="right">Saves</TableCell>
                      <TableCell align="right">Save Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.userActivity.slice(0, 10).map((user, index) => (
                      <TableRow key={index}>
                        <TableCell>{user.userId}</TableCell>
                        <TableCell align="right">{user.searches}</TableCell>
                        <TableCell align="right">{user.saves}</TableCell>
                        <TableCell align="right">
                          {user.searches > 0 ? ((user.saves / user.searches) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export const SearchResultManager: React.FC<SearchResultManagerProps> = ({
  savedResults,
  collections,
  analytics,
  onSaveResult,
  onDeleteResult,
  onStarResult,
  onShareResult,
  onCreateCollection,
  onExportResults,
}) => {
  const [activeTab, setActiveTab] = React.useState(0);
  const [editingResult, setEditingResult] = React.useState<SavedSearchResult | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const [shareResultId, setShareResultId] = React.useState<string>('');

  const handleEditResult = (result: SavedSearchResult) => {
    setEditingResult(result);
  };

  const handleShareResult = (resultId: string) => {
    setShareResultId(resultId);
    setShareDialogOpen(true);
  };

  const tabs = [
    {
      label: 'Saved Results',
      badge: savedResults.length,
      content: (
        <SavedResultsList
          results={savedResults}
          onStar={onStarResult || (() => {})}
          onDelete={onDeleteResult || (() => {})}
          onShare={handleShareResult}
          onEdit={handleEditResult}
        />
      ),
    },
    {
      label: 'Collections',
      badge: collections.length,
      content: (
        <CollectionsManager
          collections={collections}
          onCreateCollection={onCreateCollection || (() => {})}
          onDeleteCollection={() => {}}
          onEditCollection={() => {}}
        />
      ),
    },
    {
      label: 'Analytics',
      content: <SearchAnalytics analytics={analytics} />,
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Search Results Manager</Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<Download />} variant="outlined">
            Export Selected
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={
                tab.badge !== undefined ? (
                  <Badge badgeContent={tab.badge} color="primary">
                    {tab.label}
                  </Badge>
                ) : (
                  tab.label
                )
              }
            />
          ))}
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box>
        {tabs[activeTab]?.content}
      </Box>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Share Search Result</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Share this search result with other users
          </Typography>
          <TextField
            fullWidth
            label="User emails"
            placeholder="user1@example.com, user2@example.com"
            multiline
            rows={3}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Cancel</Button>
          <Button variant="contained">Share</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};