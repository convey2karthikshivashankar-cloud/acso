import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Avatar,
  IconButton,
  Typography,
  Box,
  Chip,
  Skeleton,
  Collapse,
  Menu,
  MenuItem,
  Tooltip,
  LinearProgress,
  CircularProgress,
  Badge,
  Divider,
  Button,
  alpha,
} from '@mui/material';
import {
  MoreVert,
  ExpandMore,
  ExpandLess,
  Favorite,
  FavoriteBorder,
  Share,
  Bookmark,
  BookmarkBorder,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Warning,
  CheckCircle,
  Error,
  Info,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

export interface CardAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

export interface CardMetric {
  label: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  format?: 'number' | 'percentage' | 'currency' | 'bytes';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

export interface EnhancedDataCardProps {
  title?: string;
  subtitle?: string;
  avatar?: React.ReactNode;
  image?: string;
  imageHeight?: number;
  status?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  metrics?: CardMetric[];
  progress?: {
    value: number;
    max?: number;
    label?: string;
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
    variant?: 'determinate' | 'indeterminate';
  };
  actions?: CardAction[];
  menuActions?: CardAction[];
  expandable?: boolean;
  expandedContent?: React.ReactNode;
  loading?: boolean;
  interactive?: boolean;
  selectable?: boolean;
  selected?: boolean;
  favoritable?: boolean;
  favorite?: boolean;
  bookmarkable?: boolean;
  bookmarked?: boolean;
  shareable?: boolean;
  onClick?: () => void;
  onSelect?: (selected: boolean) => void;
  onFavorite?: (favorite: boolean) => void;
  onBookmark?: (bookmarked: boolean) => void;
  onShare?: () => void;
  children?: React.ReactNode;
  elevation?: number;
  variant?: 'elevation' | 'outlined';
  sx?: object;
}

export const EnhancedDataCard: React.FC<EnhancedDataCardProps> = ({
  title,
  subtitle,
  avatar,
  image,
  imageHeight = 140,
  status = 'neutral',
  priority,
  tags = [],
  metrics = [],
  progress,
  actions = [],
  menuActions = [],
  expandable = false,
  expandedContent,
  loading = false,
  interactive = false,
  selectable = false,
  selected = false,
  favoritable = false,
  favorite = false,
  bookmarkable = false,
  bookmarked = false,
  shareable = false,
  onClick,
  onSelect,
  onFavorite,
  onBookmark,
  onShare,
  children,
  elevation = 1,
  variant = 'elevation',
  sx = {},
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const getStatusColor = () => {
    switch (status) {
      case 'success': return theme.palette.success.main;
      case 'warning': return theme.palette.warning.main;
      case 'error': return theme.palette.error.main;
      case 'info': return theme.palette.info.main;
      default: return theme.palette.grey[300];
    }
  };

  const getPriorityColor = () => {
    switch (priority) {
      case 'critical': return theme.palette.error.main;
      case 'high': return theme.palette.warning.main;
      case 'medium': return theme.palette.info.main;
      case 'low': return theme.palette.success.main;
      default: return theme.palette.grey[500];
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success': return <CheckCircle color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'error': return <Error color="error" />;
      case 'info': return <Info color="info" />;
      default: return null;
    }
  };

  const getTrendIcon = (changeType?: string) => {
    switch (changeType) {
      case 'increase': return <TrendingUp color="success" fontSize="small" />;
      case 'decrease': return <TrendingDown color="error" fontSize="small" />;
      case 'neutral': return <TrendingFlat color="disabled" fontSize="small" />;
      default: return null;
    }
  };

  const formatMetricValue = (metric: CardMetric) => {
    const { value, format } = metric;
    
    switch (format) {
      case 'percentage':
        return `${value}%`;
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(Number(value));
      case 'bytes':
        const bytes = Number(value);
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
      case 'number':
        return new Intl.NumberFormat().format(Number(value));
      default:
        return value;
    }
  };

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCardClick = () => {
    if (selectable && onSelect) {
      onSelect(!selected);
    } else if (onClick) {
      onClick();
    }
  };

  const cardSx = {
    position: 'relative',
    cursor: interactive || onClick || selectable ? 'pointer' : 'default',
    transition: theme.transitions.create(['transform', 'box-shadow'], {
      duration: theme.transitions.duration.short,
    }),
    ...(interactive && {
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows[4],
      },
    }),
    ...(selected && {
      borderColor: theme.palette.primary.main,
      boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
    }),
    ...(status !== 'neutral' && {
      borderLeft: `4px solid ${getStatusColor()}`,
    }),
    ...sx,
  };

  if (loading) {
    return (
      <Card elevation={elevation} variant={variant} sx={cardSx}>
        <CardHeader
          avatar={<Skeleton animation="wave" variant="circular" width={40} height={40} />}
          title={<Skeleton animation="wave" height={10} width="80%" />}
          subheader={<Skeleton animation="wave" height={10} width="40%" />}
        />
        {image && (
          <Skeleton sx={{ height: imageHeight }} animation="wave" variant="rectangular" />
        )}
        <CardContent>
          <Skeleton animation="wave" height={10} style={{ marginBottom: 6 }} />
          <Skeleton animation="wave" height={10} width="80%" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={elevation} variant={variant} sx={cardSx} onClick={handleCardClick}>
      {/* Status indicator */}
      {status !== 'neutral' && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1,
          }}
        >
          {getStatusIcon()}
        </Box>
      )}

      {/* Priority indicator */}
      {priority && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 0,
            height: 0,
            borderLeft: '20px solid transparent',
            borderTop: `20px solid ${getPriorityColor()}`,
            zIndex: 1,
          }}
        />
      )}

      {/* Header */}
      <CardHeader
        avatar={avatar}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {favoritable && (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onFavorite?.(!favorite);
                }}
                size="small"
              >
                {favorite ? <Favorite color="error" /> : <FavoriteBorder />}
              </IconButton>
            )}
            
            {bookmarkable && (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onBookmark?.(!bookmarked);
                }}
                size="small"
              >
                {bookmarked ? <Bookmark color="primary" /> : <BookmarkBorder />}
              </IconButton>
            )}
            
            {shareable && (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onShare?.();
                }}
                size="small"
              >
                <Share />
              </IconButton>
            )}
            
            {menuActions.length > 0 && (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleMenuClick(e);
                }}
                size="small"
              >
                <MoreVert />
              </IconButton>
            )}
          </Box>
        }
        title={title}
        subheader={subtitle}
      />

      {/* Image */}
      {image && (
        <Box
          component="img"
          sx={{
            height: imageHeight,
            width: '100%',
            objectFit: 'cover',
          }}
          src={image}
          alt={title}
        />
      )}

      {/* Content */}
      <CardContent>
        {/* Tags */}
        {tags.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {tags.map((tag, index) => (
              <Chip key={index} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        )}

        {/* Progress */}
        {progress && (
          <Box sx={{ mb: 2 }}>
            {progress.label && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {progress.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {progress.variant === 'determinate' && 
                    `${Math.round(progress.value)}${progress.max ? `/${progress.max}` : '%'}`
                  }
                </Typography>
              </Box>
            )}
            <LinearProgress
              variant={progress.variant || 'determinate'}
              value={progress.value}
              color={progress.color || 'primary'}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}

        {/* Metrics */}
        {metrics.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {metrics.map((metric, index) => (
                <Box key={index} sx={{ minWidth: 0, flex: '1 1 auto' }}>
                  <Typography variant="h6" color={metric.color || 'text.primary'}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {formatMetricValue(metric)}
                      {metric.change !== undefined && getTrendIcon(metric.changeType)}
                    </Box>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {metric.label}
                  </Typography>
                  {metric.change !== undefined && (
                    <Typography
                      variant="caption"
                      color={
                        metric.changeType === 'increase' ? 'success.main' :
                        metric.changeType === 'decrease' ? 'error.main' : 'text.secondary'
                      }
                    >
                      {metric.change > 0 ? '+' : ''}{metric.change}%
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Custom content */}
        {children}
      </CardContent>

      {/* Actions */}
      {(actions.length > 0 || expandable) && (
        <CardActions disableSpacing>
          {actions.map((action, index) => (
            <Button
              key={index}
              size="small"
              startIcon={action.icon}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              disabled={action.disabled}
              color={action.color}
            >
              {action.label}
            </Button>
          ))}
          
          {expandable && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handleExpandClick();
              }}
              sx={{ marginLeft: 'auto' }}
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </CardActions>
      )}

      {/* Expanded content */}
      {expandable && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <CardContent>
            <Divider sx={{ mb: 2 }} />
            {expandedContent}
          </CardContent>
        </Collapse>
      )}

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        {menuActions.map((action, index) => (
          <MenuItem
            key={index}
            onClick={() => {
              action.onClick();
              handleMenuClose();
            }}
            disabled={action.disabled}
          >
            {action.icon && (
              <Box sx={{ mr: 1, display: 'flex' }}>
                {action.icon}
              </Box>
            )}
            {action.label}
          </MenuItem>
        ))}
      </Menu>
    </Card>
  );
};