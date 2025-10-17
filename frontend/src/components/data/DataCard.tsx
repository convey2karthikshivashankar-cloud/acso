import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  CardHeader,
  CardMedia,
  Typography,
  Button,
  IconButton,
  Chip,
  Avatar,
  Box,
  Divider,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Favorite as FavoriteIcon,
  Share as ShareIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface DataCardProps {
  title?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  avatar?: string;
  avatarText?: string;
  status?: {
    label: string;
    color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  };
  tags?: string[];
  metadata?: Array<{
    label: string;
    value: string | number;
    icon?: React.ReactNode;
  }>;
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
    variant?: 'text' | 'outlined' | 'contained';
  }>;
  headerActions?: Array<{
    icon: React.ReactNode;
    onClick: () => void;
    tooltip?: string;
  }>;
  onClick?: () => void;
  loading?: boolean;
  elevation?: number;
  variant?: 'elevation' | 'outlined';
  selected?: boolean;
  disabled?: boolean;
  maxWidth?: number | string;
  height?: number | string;
  imageHeight?: number;
}

export const DataCard: React.FC<DataCardProps> = ({
  title,
  subtitle,
  description,
  image,
  avatar,
  avatarText,
  status,
  tags = [],
  metadata = [],
  actions = [],
  headerActions = [],
  onClick,
  loading = false,
  elevation = 1,
  variant = 'elevation',
  selected = false,
  disabled = false,
  maxWidth,
  height,
  imageHeight = 140,
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Card
        elevation={elevation}
        variant={variant}
        sx={{
          maxWidth,
          height,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {image && (
          <Skeleton variant="rectangular" height={imageHeight} />
        )}
        <CardHeader
          avatar={<Skeleton variant="circular" width={40} height={40} />}
          title={<Skeleton variant="text" width="60%" />}
          subheader={<Skeleton variant="text" width="40%" />}
        />
        <CardContent>
          <Skeleton variant="text" />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="60%" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      elevation={elevation}
      variant={variant}
      onClick={onClick}
      sx={{
        maxWidth,
        height,
        cursor: onClick ? 'pointer' : 'default',
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        border: selected ? `2px solid ${theme.palette.primary.main}` : undefined,
        backgroundColor: selected 
          ? alpha(theme.palette.primary.main, 0.04)
          : undefined,
        transition: theme.transitions.create(['transform', 'box-shadow'], {
          duration: theme.transitions.duration.short,
        }),
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[elevation + 2],
        } : {},
      }}
    >
      {/* Card Media */}
      {image && (
        <CardMedia
          component="img"
          height={imageHeight}
          image={image}
          alt={title}
        />
      )}

      {/* Card Header */}
      {(title || subtitle || avatar || avatarText || headerActions.length > 0) && (
        <CardHeader
          avatar={
            avatar || avatarText ? (
              <Avatar src={avatar} sx={{ bgcolor: theme.palette.primary.main }}>
                {avatarText}
              </Avatar>
            ) : undefined
          }
          action={
            headerActions.length > 0 ? (
              <Box>
                {headerActions.map((action, index) => (
                  <IconButton
                    key={index}
                    aria-label={action.tooltip}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                    }}
                  >
                    {action.icon}
                  </IconButton>
                ))}
              </Box>
            ) : undefined
          }
          title={title}
          subheader={subtitle}
          titleTypographyProps={{
            variant: 'h6',
            component: 'h3',
          }}
          subheaderTypographyProps={{
            variant: 'body2',
            color: 'text.secondary',
          }}
        />
      )}

      {/* Card Content */}
      <CardContent sx={{ pt: title || subtitle ? 0 : undefined }}>
        {/* Status */}
        {status && (
          <Box sx={{ mb: 1 }}>
            <Chip
              label={status.label}
              color={status.color}
              size="small"
              variant="outlined"
            />
          </Box>
        )}

        {/* Description */}
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
        )}

        {/* Metadata */}
        {metadata.length > 0 && (
          <Box sx={{ mb: 2 }}>
            {metadata.map((item, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: 0.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {item.icon}
                  <Typography variant="body2" color="text.secondary">
                    {item.label}
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight="medium">
                  {item.value}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
            {tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                size="small"
                variant="outlined"
                color="default"
              />
            ))}
          </Box>
        )}
      </CardContent>

      {/* Card Actions */}
      {actions.length > 0 && (
        <>
          <Divider />
          <CardActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
            {actions.map((action, index) => (
              <Button
                key={index}
                size="small"
                startIcon={action.icon}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                color={action.color}
                variant={action.variant || 'text'}
              >
                {action.label}
              </Button>
            ))}
          </CardActions>
        </>
      )}
    </Card>
  );
};

// Grid container for data cards
export const DataCardGrid: React.FC<{
  children: React.ReactNode;
  spacing?: number;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}> = ({
  children,
  spacing = 2,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
}) => {
  const { Grid } = require('@mui/material');

  return (
    <Grid container spacing={spacing}>
      {React.Children.map(children, (child, index) => (
        <Grid
          item
          xs={12 / (columns.xs || 1)}
          sm={12 / (columns.sm || 2)}
          md={12 / (columns.md || 3)}
          lg={12 / (columns.lg || 4)}
          xl={12 / (columns.xl || 4)}
          key={index}
        >
          {child}
        </Grid>
      ))}
    </Grid>
  );
};

// Specialized card variants
export const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  loading?: boolean;
}> = ({ title, value, change, icon, color = 'primary', loading }) => {
  const theme = useTheme();

  return (
    <DataCard
      loading={loading}
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon && (
            <Avatar
              sx={{
                bgcolor: `${color}.main`,
                width: 32,
                height: 32,
              }}
            >
              {icon}
            </Avatar>
          )}
          <Typography variant="h4" component="div" fontWeight="bold">
            {value}
          </Typography>
        </Box>
      }
      subtitle={title}
      metadata={
        change
          ? [
              {
                label: 'Change',
                value: `${change.value > 0 ? '+' : ''}${change.value}%`,
                icon: change.type === 'increase' ? '📈' : '📉',
              },
            ]
          : []
      }
    />
  );
};

export const StatusCard: React.FC<{
  title: string;
  items: Array<{
    name: string;
    status: 'healthy' | 'warning' | 'error';
    value?: string;
  }>;
  loading?: boolean;
}> = ({ title, items, loading }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <DataCard
      title={title}
      loading={loading}
      metadata={items.map((item) => ({
        label: item.name,
        value: item.value || item.status,
        icon: (
          <Chip
            size="small"
            label={item.status}
            color={getStatusColor(item.status) as any}
            variant="outlined"
          />
        ),
      }))}
    />
  );
};