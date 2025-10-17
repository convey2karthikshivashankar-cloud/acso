import React from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Skeleton,
  Typography,
  Fade,
  Backdrop,
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';

// Loading spinner variants
export interface LoadingSpinnerProps {
  size?: number | 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'inherit';
  thickness?: number;
  variant?: 'determinate' | 'indeterminate';
  value?: number;
  label?: string;
  overlay?: boolean;
}

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(4),
}));

const OverlayContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(2px)',
  zIndex: theme.zIndex.modal - 1,
}));

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  thickness = 4,
  variant = 'indeterminate',
  value,
  label,
  overlay = false,
}) => {
  const getSize = () => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'small': return 24;
      case 'large': return 60;
      default: return 40;
    }
  };

  const spinner = (
    <LoadingContainer>
      <CircularProgress
        size={getSize()}
        color={color}
        thickness={thickness}
        variant={variant}
        value={value}
      />
      {label && (
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      )}
      {variant === 'determinate' && value !== undefined && (
        <Typography variant="caption" color="text.secondary">
          {Math.round(value)}%
        </Typography>
      )}
    </LoadingContainer>
  );

  if (overlay) {
    return (
      <OverlayContainer>
        {spinner}
      </OverlayContainer>
    );
  }

  return spinner;
};

// Linear progress bar
export interface LoadingBarProps {
  variant?: 'determinate' | 'indeterminate' | 'buffer' | 'query';
  value?: number;
  valueBuffer?: number;
  color?: 'primary' | 'secondary' | 'inherit';
  label?: string;
  showPercentage?: boolean;
}

export const LoadingBar: React.FC<LoadingBarProps> = ({
  variant = 'indeterminate',
  value,
  valueBuffer,
  color = 'primary',
  label,
  showPercentage = false,
}) => {
  return (
    <Box sx={{ width: '100%' }}>
      {(label || showPercentage) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          {label && (
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
          )}
          {showPercentage && variant === 'determinate' && value !== undefined && (
            <Typography variant="body2" color="text.secondary">
              {Math.round(value)}%
            </Typography>
          )}
        </Box>
      )}
      <LinearProgress
        variant={variant}
        value={value}
        valueBuffer={valueBuffer}
        color={color}
        sx={{ borderRadius: 1, height: 8 }}
      />
    </Box>
  );
};

// Skeleton loaders
export interface SkeletonLoaderProps {
  variant?: 'text' | 'rectangular' | 'rounded' | 'circular';
  width?: number | string;
  height?: number | string;
  lines?: number;
  animation?: 'pulse' | 'wave' | false;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  width,
  height,
  lines = 1,
  animation = 'pulse',
}) => {
  if (variant === 'text' && lines > 1) {
    return (
      <Box>
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            variant="text"
            width={index === lines - 1 ? '60%' : width}
            height={height}
            animation={animation}
            sx={{ mb: 0.5 }}
          />
        ))}
      </Box>
    );
  }

  return (
    <Skeleton
      variant={variant}
      width={width}
      height={height}
      animation={animation}
    />
  );
};

// Animated dots loader
const dotAnimation = keyframes`
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
`;

const DotsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(0.5),
}));

const Dot = styled(Box)(({ theme }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main,
  animation: `${dotAnimation} 1.4s infinite ease-in-out both`,
  '&:nth-of-type(1)': { animationDelay: '-0.32s' },
  '&:nth-of-type(2)': { animationDelay: '-0.16s' },
}));

export const DotsLoader: React.FC<{ color?: string }> = ({ color }) => (
  <DotsContainer>
    <Dot sx={{ backgroundColor: color }} />
    <Dot sx={{ backgroundColor: color }} />
    <Dot sx={{ backgroundColor: color }} />
  </DotsContainer>
);

// Pulse loader
const pulseAnimation = keyframes`
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
`;

const PulseContainer = styled(Box)({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const PulseRing = styled(Box)(({ theme }) => ({
  position: 'absolute',
  border: `2px solid ${theme.palette.primary.main}`,
  borderRadius: '50%',
  animation: `${pulseAnimation} 1s cubic-bezier(0.165, 0.84, 0.44, 1) infinite`,
  '&:nth-of-type(2)': { animationDelay: '0.5s' },
}));

export const PulseLoader: React.FC<{ size?: number; color?: string }> = ({ 
  size = 40, 
  color 
}) => (
  <PulseContainer sx={{ width: size, height: size }}>
    <PulseRing 
      sx={{ 
        width: size, 
        height: size,
        borderColor: color,
      }} 
    />
    <PulseRing 
      sx={{ 
        width: size, 
        height: size,
        borderColor: color,
      }} 
    />
  </PulseContainer>
);

// Full page loader
export interface FullPageLoaderProps {
  message?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
  backdrop?: boolean;
}

export const FullPageLoader: React.FC<FullPageLoaderProps> = ({
  message = 'Loading...',
  variant = 'spinner',
  backdrop = true,
}) => {
  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return <DotsLoader />;
      case 'pulse':
        return <PulseLoader />;
      default:
        return <LoadingSpinner size="large" />;
    }
  };

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2,
      }}
    >
      {renderLoader()}
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );

  if (backdrop) {
    return (
      <Backdrop open sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        {content}
      </Backdrop>
    );
  }

  return content;
};

// Page section loader
export const PageLoader: React.FC<{ message?: string }> = ({ 
  message = 'Loading...' 
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 200,
      gap: 2,
    }}
  >
    <LoadingSpinner />
    <Typography variant="body2" color="text.secondary">
      {message}
    </Typography>
  </Box>
);

// Content skeleton templates
export const CardSkeleton: React.FC = () => (
  <Box sx={{ p: 2 }}>
    <Skeleton variant="text" width="60%" height={32} />
    <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
    <Skeleton variant="rectangular" width="100%" height={120} />
    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
      <Skeleton variant="rectangular" width={80} height={32} />
      <Skeleton variant="rectangular" width={80} height={32} />
    </Box>
  </Box>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <Box>
    {/* Header */}
    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={index} variant="text" width="100%" height={40} />
      ))}
    </Box>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <Box key={rowIndex} sx={{ display: 'flex', gap: 2, mb: 1 }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} variant="text" width="100%" height={32} />
        ))}
      </Box>
    ))}
  </Box>
);

export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <Box>
    {Array.from({ length: items }).map((_, index) => (
      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="70%" height={24} />
          <Skeleton variant="text" width="50%" height={20} />
        </Box>
      </Box>
    ))}
  </Box>
);