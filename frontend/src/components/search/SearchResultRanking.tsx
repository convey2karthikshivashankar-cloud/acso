import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Rating,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Slider,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
} from '@mui/material';
import {
  TuneOutlined as TuneIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Star as StarIcon,
  Analytics as AnalyticsIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  url: string;
  relevanceScore: number;
  highlights: Array<{
    field: string;
    snippet: string;
  }>;
  metadata: Record<string, any>;
  timestamp: Date;
  userRating?: number;
  userFeedback?: 'positive' | 'negative';
  clickCount?: number;
  viewDuration?: number;
}

export interface RankingConfig {
  weights: {
    relevance: number;
    recency: number;
    popularity: number;
    userRating: number;
    type: number;
    category: number;
  };
  boosts: {
    exactMatch: number;
    titleMatch: number;
    recentContent: number;
    highRated: number;
  };
  penalties: {
    lowRated: number;
    oldContent: number;
    lowEngagement: number;
  };
  typePreferences: Record<string, number>;
  categoryPreferences: Record<string, number>;
}

interface SearchResultRankingProps {
  results: SearchResult[];
  query: string;
  onResultsReorder: (results: SearchResult[]) => void;
  onFeedback: (resultId: string, feedback: 'positive' | 'negative') => void;
  onRating: (resultId: string, rating: number) => void;
  initialConfig?: Partial<RankingConfig>;
}

const defaultRankingConfig: RankingConfig = {
  weights: {
    relevance: 0.4,
    recency: 0.2,
    popularity: 0.15,
    userRating: 0.15,
    type: 0.05,
    category: 0.05,
  },
  boosts: {
    exactMatch: 1.5,
    titleMatch: 1.3,
    recentContent: 1.2,
    highRated: 1.25,
  },
  penalties: {
    lowRated: 0.8,
    oldContent: 0.9,
    lowEngagement: 0.85,
  },
  typePreferences: {
    incident: 1.2,
    agent: 1.0,
    financial: 0.9,
    system: 0.8,
  },
  categoryPreferences: {
    Security: 1.3,
    System: 1.0,
    Finance: 0.9,
    General: 0.8,
  },
};

const SearchResultRanking: React.FC<SearchResultRankingProps> = ({
  results,
  query,
  onResultsReorder,
  onFeedback,
  onRating,
  initialConfig,
}) => {
  const [config, setConfig] = useState<RankingConfig>({
    ...defaultRankingConfig,
    ...initialConfig,
  });
  
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [autoRerank, setAutoRerank] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  // Calculate relevance score for a result
  const calculateRelevanceScore = (result: SearchResult): number => {
    let score = result.relevanceScore || 0;
    
    // Exact match boost
    if (result.title.toLowerCase().includes(query.toLowerCase())) {
      score *= config.boosts.exactMatch;
    }
    
    // Title match boost
    if (result.title.toLowerCase().startsWith(query.toLowerCase())) {
      score *= config.boosts.titleMatch;
    }
    
    return Math.min(score, 1.0);
  };

  // Calculate recency score
  const calculateRecencyScore = (result: SearchResult): number => {
    const now = new Date();
    const resultDate = new Date(result.timestamp);
    const daysDiff = (now.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Exponential decay over time
    let score = Math.exp(-daysDiff / 30); // 30-day half-life
    
    // Recent content boost
    if (daysDiff < 7) {
      score *= config.boosts.recentContent;
    }
    
    // Old content penalty
    if (daysDiff > 90) {
      score *= config.penalties.oldContent;
    }
    
    return score;
  };

  // Calculate popularity score
  const calculatePopularityScore = (result: SearchResult): number => {
    const clickCount = result.clickCount || 0;
    const viewDuration = result.viewDuration || 0;
    
    // Normalize click count (assuming max of 1000 clicks)
    const clickScore = Math.min(clickCount / 1000, 1.0);
    
    // Normalize view duration (assuming max of 300 seconds)
    const durationScore = Math.min(viewDuration / 300, 1.0);
    
    let score = (clickScore + durationScore) / 2;
    
    // Low engagement penalty
    if (clickCount < 5 && viewDuration < 30) {
      score *= config.penalties.lowEngagement;
    }
    
    return score;
  };

  // Calculate user rating score
  const calculateUserRatingScore = (result: SearchResult): number => {
    const rating = result.userRating || 0;
    let score = rating / 5.0; // Normalize to 0-1
    
    // High rating boost
    if (rating >= 4) {
      score *= config.boosts.highRated;
    }
    
    // Low rating penalty
    if (rating <= 2) {
      score *= config.penalties.lowRated;
    }
    
    return score;
  };

  // Calculate type preference score
  const calculateTypeScore = (result: SearchResult): number => {
    return config.typePreferences[result.type] || 1.0;
  };

  // Calculate category preference score
  const calculateCategoryScore = (result: SearchResult): number => {
    return config.categoryPreferences[result.category] || 1.0;
  };

  // Calculate overall ranking score
  const calculateRankingScore = (result: SearchResult): number => {
    const relevanceScore = calculateRelevanceScore(result);
    const recencyScore = calculateRecencyScore(result);
    const popularityScore = calculatePopularityScore(result);
    const userRatingScore = calculateUserRatingScore(result);
    const typeScore = calculateTypeScore(result);
    const categoryScore = calculateCategoryScore(result);

    const weightedScore = 
      relevanceScore * config.weights.relevance +
      recencyScore * config.weights.recency +
      popularityScore * config.weights.popularity +
      userRatingScore * config.weights.userRating +
      typeScore * config.weights.type +
      categoryScore * config.weights.category;

    return weightedScore;
  };

  // Rank and sort results
  const rankedResults = useMemo(() => {
    const resultsWithScores = results.map(result => ({
      ...result,
      rankingScore: calculateRankingScore(result),
    }));

    return resultsWithScores.sort((a, b) => b.rankingScore - a.rankingScore);
  }, [results, config, query]);

  // Auto-rerank when config changes
  useEffect(() => {
    if (autoRerank) {
      onResultsReorder(rankedResults);
    }
  }, [rankedResults, autoRerank, onResultsReorder]);

  const handleFeedback = (resultId: string, feedback: 'positive' | 'negative') => {
    onFeedback(resultId, feedback);
    
    // Adjust ranking based on feedback
    if (feedback === 'positive') {
      // Boost similar results
      const result = results.find(r => r.id === resultId);
      if (result) {
        setConfig(prev => ({
          ...prev,
          typePreferences: {
            ...prev.typePreferences,
            [result.type]: Math.min((prev.typePreferences[result.type] || 1.0) * 1.1, 2.0),
          },
          categoryPreferences: {
            ...prev.categoryPreferences,
            [result.category]: Math.min((prev.categoryPreferences[result.category] || 1.0) * 1.1, 2.0),
          },
        }));
      }
    }
  };

  const handleRating = (resultId: string, rating: number) => {
    onRating(resultId, rating);
  };

  const resetConfig = () => {
    setConfig(defaultRankingConfig);
  };

  const saveConfig = () => {
    localStorage.setItem('search_ranking_config', JSON.stringify(config));
    setConfigDialogOpen(false);
  };

  const loadConfig = () => {
    try {
      const saved = localStorage.getItem('search_ranking_config');
      if (saved) {
        setConfig(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load ranking config:', error);
    }
  };

  const getAnalytics = () => {
    const typeDistribution = results.reduce((acc, result) => {
      acc[result.type] = (acc[result.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryDistribution = results.reduce((acc, result) => {
      acc[result.category] = (acc[result.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgRelevance = results.reduce((sum, result) => sum + (result.relevanceScore || 0), 0) / results.length;
    const avgRating = results.reduce((sum, result) => sum + (result.userRating || 0), 0) / results.length;

    return {
      totalResults: results.length,
      typeDistribution,
      categoryDistribution,
      avgRelevance,
      avgRating,
      topResult: rankedResults[0],
    };
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Search Results ({rankedResults.length})
        </Typography>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={autoRerank}
                onChange={(e) => setAutoRerank(e.target.checked)}
                size="small"
              />
            }
            label="Auto-rerank"
          />
          <IconButton
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            size="small"
          >
            <TuneIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Results List */}
      <Box>
        {rankedResults.map((result, index) => (
          <Card key={result.id} sx={{ mb: 2 }} variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" component="h3">
                      {result.title}
                    </Typography>
                    <Chip
                      label={`#${index + 1}`}
                      size="small"
                      color="primary"
                      sx={{ ml: 1 }}
                    />
                    <Chip
                      label={`Score: ${result.rankingScore?.toFixed(3)}`}
                      size="small"
                      variant="outlined"
                      sx={{ ml: 1 }}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {result.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Chip label={result.type} size="small" />
                    <Chip label={result.category} size="small" variant="outlined" />
                    <Chip 
                      label={`Relevance: ${(result.relevanceScore * 100).toFixed(0)}%`} 
                      size="small" 
                      color="info"
                    />
                  </Box>
                  
                  {result.highlights.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {result.highlights.map((highlight, idx) => (
                        <Typography
                          key={idx}
                          variant="caption"
                          sx={{
                            display: 'block',
                            bgcolor: 'action.hover',
                            p: 0.5,
                            borderRadius: 1,
                            mb: 0.5,
                          }}
                          dangerouslySetInnerHTML={{ __html: highlight.snippet }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ml: 2 }}>
                  <Rating
                    value={result.userRating || 0}
                    onChange={(_, value) => handleRating(result.id, value || 0)}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => handleFeedback(result.id, 'positive')}
                      color={result.userFeedback === 'positive' ? 'success' : 'default'}
                    >
                      <ThumbUpIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleFeedback(result.id, 'negative')}
                      color={result.userFeedback === 'negative' ? 'error' : 'default'}
                    >
                      <ThumbDownIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => { setConfigDialogOpen(true); setMenuAnchor(null); }}>
          <TuneIcon sx={{ mr: 1 }} />
          Configure Ranking
        </MenuItem>
        <MenuItem onClick={() => { setAnalyticsDialogOpen(true); setMenuAnchor(null); }}>
          <AnalyticsIcon sx={{ mr: 1 }} />
          View Analytics
        </MenuItem>
        <MenuItem onClick={() => { loadConfig(); setMenuAnchor(null); }}>
          <RefreshIcon sx={{ mr: 1 }} />
          Load Saved Config
        </MenuItem>
        <MenuItem onClick={() => { resetConfig(); setMenuAnchor(null); }}>
          Reset to Default
        </MenuItem>
      </Menu>

      {/* Configuration Dialog */}
      <Dialog
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Ranking Configuration</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Weights
          </Typography>
          {Object.entries(config.weights).map(([key, value]) => (
            <Box key={key} sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                {key.charAt(0).toUpperCase() + key.slice(1)}: {value.toFixed(2)}
              </Typography>
              <Slider
                value={value}
                onChange={(_, newValue) => setConfig(prev => ({
                  ...prev,
                  weights: { ...prev.weights, [key]: newValue as number },
                }))}
                min={0}
                max={1}
                step={0.05}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
          ))}
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Boosts
          </Typography>
          {Object.entries(config.boosts).map(([key, value]) => (
            <Box key={key} sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                {key.charAt(0).toUpperCase() + key.slice(1)}: {value.toFixed(2)}
              </Typography>
              <Slider
                value={value}
                onChange={(_, newValue) => setConfig(prev => ({
                  ...prev,
                  boosts: { ...prev.boosts, [key]: newValue as number },
                }))}
                min={1}
                max={2}
                step={0.05}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
          <Button onClick={resetConfig}>Reset</Button>
          <Button onClick={saveConfig} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog
        open={analyticsDialogOpen}
        onClose={() => setAnalyticsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Search Analytics</DialogTitle>
        <DialogContent>
          {(() => {
            const analytics = getAnalytics();
            return (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Overview
                </Typography>
                <Typography>Total Results: {analytics.totalResults}</Typography>
                <Typography>Average Relevance: {(analytics.avgRelevance * 100).toFixed(1)}%</Typography>
                <Typography>Average Rating: {analytics.avgRating.toFixed(1)}/5</Typography>
                
                <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>
                  Type Distribution
                </Typography>
                {Object.entries(analytics.typeDistribution).map(([type, count]) => (
                  <Typography key={type}>
                    {type}: {count} ({((count / analytics.totalResults) * 100).toFixed(1)}%)
                  </Typography>
                ))}
                
                <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>
                  Category Distribution
                </Typography>
                {Object.entries(analytics.categoryDistribution).map(([category, count]) => (
                  <Typography key={category}>
                    {category}: {count} ({((count / analytics.totalResults) * 100).toFixed(1)}%)
                  </Typography>
                ))}
                
                {analytics.topResult && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Top Result
                    </Typography>
                    <Alert severity="info">
                      <Typography variant="subtitle2">{analytics.topResult.title}</Typography>
                      <Typography variant="body2">
                        Score: {analytics.topResult.rankingScore?.toFixed(3)}
                      </Typography>
                    </Alert>
                  </Box>
                )}
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnalyticsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SearchResultRanking;