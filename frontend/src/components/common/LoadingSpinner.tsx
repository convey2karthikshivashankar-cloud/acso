import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Backdrop,
  useTheme,
} from '@mui/material';

interface LoadingSpinnerProps {
  size?: number | string;
  message?: string;
  overlay?: boolean;
  color?: 'primary' | 'secondary' | 'inherit';
  thickness?: number;
  variant?: 'determinate' | 'indeterminate';
  value?: number;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  message,
  overlay = false,
  color = 'primary',
  thickness = 3.6,
  variant = 'indeterminate',
  value,
  fullScreen = false,
}) => {
  const theme = useTheme();

  const spinner = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 2,
      }}
    >
      <CircularProgress
        size={size}
        color={color}
        thickness={thickness}
        variant={variant}
        value={value}
      />
      {message && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: 'center', maxWidth: 300 }}
        >
          {message}
        </Typography>
      )}
      {variant === 'determinate' && value !== undefined && (
        <Typography variant="caption" color="text.secondary">
          {Math.round(value)}%
        </Typography>
      )}
    </Box>
  );

  if (overlay || fullScreen) {
    return (
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: fullScreen 
            ? 'rgba(0, 0, 0, 0.8)' 
            : 'rgba(255, 255, 255, 0.8)',
        }}
        open={true}
      >
        {spinner}
      </Backdrop>
    );
  }

  return spinner;
};

// Inline loading spinner for smaller spaces
export const InlineSpinner: React.FC<{
  size?: number;
  color?: 'primary' | 'secondary' | 'inherit';
}> = ({ size = 20, color = 'primary' }) => (
  <CircularProgress size={size} color={color} thickness={4} />
);

// Loading skeleton component
export const LoadingSkeleton: React.FC<{
  variant?: 'text' | 'rectangular' | 'circular';
  width?: number | string;
  height?: number | string;
  animation?: 'pulse' | 'wave' | false;
}> = ({ variant = 'text', width, height, animation = 'wave' }) => {
  const { Skeleton } = require('@mui/material');
  
  return (
    <Skeleton
      variant={variant}
      width={width}
      height={height}
      animation={animation}
    />
  );
};

export default LoadingSpinner;