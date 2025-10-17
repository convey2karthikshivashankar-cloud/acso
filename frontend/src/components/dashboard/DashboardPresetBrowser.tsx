import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Typography,
  Button,
  Chip,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  Rating,
  Tooltip,
  Badge,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search,
  FilterList,
  Favorite,
  FavoriteBorder,
  Preview,
  Download,
  Share,
  Star,
  StarBorder,
  Palette,
  GridView,
  ViewModule,
  TrendingUp,
  AccessTime,
  Person,
  Close,
  Refresh,
} from '@mui/icons-material';
import { DashboardPreset, dashboardPersonalizationService } from '../../services/dashboardPersonalizationService';
import { DashboardTemplate } from './DashboardLayoutEngine';
import { DashboardCustomization } from './DashboardCustomizer';

interface DashboardPresetBrowserProps {
  open: boolean;
  onClose: () => void;
  dashboard: DashboardTemplate;
  userId: string;
  onApplyPreset: (preset: DashboardPreset) => Promise<void>;
  onPreviewPreset: (preset: DashboardPreset) => void;
}

interface PresetCardProps {
  preset: DashboardPreset;
  isFavorite: boolean;
  onToggleFavorite: (presetId: string) => void;
  onApply: (preset: DashboardPreset) => void;
  onPreview: (preset: DashboardPreset) => void;
}

const PresetCard: React.FC<PresetCardProps> = ({
  preset,
  isFavorite,
  onToggleFavorite,
  onApply,
  onPreview,
}) => {
  const theme = useTheme();

  const getCategoryIcon = (category: DashboardPreset['category']) => {
    switch (category) {
      case 'theme':
        return <Palette />;
      case 'layout':
        return <GridView />;
      case 'complete':
        return <ViewModule />;
      default:
        return <ViewModule />;
    }
  };

  const getCategoryColor = (category: DashboardPreset['category']) => {
    switch (category) {
      case 'theme':
        return 'primary';
      case 'layout':
        return 'secondary';
      case 'complete':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
        },
      }}
    >
      {preset.preview && (
        <CardMedia
          component="img"
          height="120"
          image={preset.preview}
          alt={preset.name}
          sx={{ objectFit: 'cover' }}
        />
      )}
      <CardContent sx={{ flex: 1, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" component="h3" sx={{ flex: 1, mr: 1 }}>
            {preset.name}
          </Typography>
          <IconButton
            size="small"
            onClick={() => onToggleFavorite(preset.id)}
            color={isFavorite ? 'error' : 'default'}
          >
            {isFavorite ? <Favorite /> : <FavoriteBorder />}
          </IconButton>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {preset.description}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Chip
            icon={getCategoryIcon(preset.category)}
            label={preset.category.charAt(0).toUpperCase() + preset.category.slice(1)}
            size="small"
            color={getCategoryColor(preset.category) as any}
            variant="outlined"
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUp sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {preset.popularity}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
          {preset.tags.slice(0, 3).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          ))}
          {preset.tags.length > 3 && (
            <Chip
              label={`+${preset.tags.length - 3}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          )}
        </Box>

        {preset.createdBy && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 20, height: 20 }}>
              <Person sx={{ fontSize: 14 }} />
            </Avatar>
            <Typography variant="caption" color="text.secondary">
              by {preset.createdBy}
            </Typography>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
        <Button
          size="small"
          startIcon={<Preview />}
          onClick={() => onPreview(preset)}
        >
          Preview
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={<Download />}
          onClick={() => onApply(preset)}
        >
          Apply
        </Button>
      </CardActions>
    </Card>
  );
};

export const DashboardPresetBrowser: React.FC<DashboardPresetBrowserProps> = ({
  open,
  onClose,
  dashboard,
  userId,
  onApplyPreset,
  onPreviewPreset,
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [sortBy, setSortBy] = React.useState<'popularity' | 'name' | 'recent'>('popularity');
  const [presets, setPresets] = React.useState<DashboardPreset[]>([]);
  const [favoritePresets, setFavoritePresets] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      loadPresets();
      loadFavorites();
    }
  }, [open, categoryFilter, sortBy]);

  const loadPresets = async () => {
    setLoading(true);
    try {
      const allPresets = dashboardPersonalizationService.getPresets(
        categoryFilter === 'all' ? undefined : categoryFilter as any
      );
      
      // Sort presets
      const sortedPresets = [...allPresets].sort((a, b) => {
        switch (sortBy) {
          case 'popularity':
            return b.popularity - a.popularity;
          case 'name':
            return a.name.localeCompare(b.name);
          case 'recent':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          default:
            return 0;
        }
      });

      setPresets(sortedPresets);
    } catch (error) {
      console.error('Failed to load presets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const favorites = await dashboardPersonalizationService.getFavoritePresets(userId);
      setFavoritePresets(favorites.map(f => f.id));
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  };

  const handleToggleFavorite = async (presetId: string) => {
    try {
      await dashboardPersonalizationService.toggleFavoritePreset(userId, presetId);
      await loadFavorites();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleApplyPreset = async (preset: DashboardPreset) => {
    try {
      await onApplyPreset(preset);
      onClose();
    } catch (error) {
      console.error('Failed to apply preset:', error);
    }
  };

  const filteredPresets = React.useMemo(() => {
    let filtered = presets;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(preset =>
        preset.name.toLowerCase().includes(query) ||
        preset.description.toLowerCase().includes(query) ||
        preset.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply tab filter
    if (activeTab === 1) {
      // Favorites tab
      filtered = filtered.filter(preset => favoritePresets.includes(preset.id));
    } else if (activeTab === 2) {
      // Popular tab
      filtered = filtered.filter(preset => preset.popularity > 70);
    }

    return filtered;
  }, [presets, searchQuery, activeTab, favoritePresets]);

  const tabs = [
    { label: 'All Presets', count: presets.length },
    { label: 'Favorites', count: favoritePresets.length },
    { label: 'Popular', count: presets.filter(p => p.popularity > 70).length },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ViewModule />
            <Typography variant="h6">Dashboard Presets</Typography>
          </Box>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tab.label}
                  <Badge badgeContent={tab.count} color="primary" />
                </Box>
              }
            />
          ))}
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search presets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              label="Category"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="theme">Theme</MenuItem>
              <MenuItem value="layout">Layout</MenuItem>
              <MenuItem value="complete">Complete</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              label="Sort By"
            >
              <MenuItem value="popularity">Popularity</MenuItem>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="recent">Recent</MenuItem>
            </Select>
          </FormControl>

          <Button
            startIcon={<Refresh />}
            onClick={loadPresets}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        {/* Preset Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography>Loading presets...</Typography>
          </Box>
        ) : filteredPresets.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No presets found
            </Typography>
            <Typography color="text.secondary">
              Try adjusting your search or filters
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filteredPresets.map((preset) => (
              <Grid item xs={12} sm={6} md={4} key={preset.id}>
                <PresetCard
                  preset={preset}
                  isFavorite={favoritePresets.includes(preset.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onApply={handleApplyPreset}
                  onPreview={onPreviewPreset}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          {filteredPresets.length} preset{filteredPresets.length !== 1 ? 's' : ''} found
        </Typography>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};