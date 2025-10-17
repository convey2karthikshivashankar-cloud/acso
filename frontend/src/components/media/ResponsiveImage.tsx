import React from 'react';
import { Box, Skeleton, useTheme } from '@mui/material';
import { Breakpoint } from '@mui/material/styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';

export interface ResponsiveImageSource {
  src: string;
  breakpoint?: Breakpoint;
  width?: number;
  height?: number;
  density?: '1x' | '2x' | '3x';
}

export interface ResponsiveImageProps {
  src: string | ResponsiveImageSource[];
  alt: string;
  aspectRatio?: string | Partial<Record<Breakpoint, string>>;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
  loading?: 'lazy' | 'eager';
  placeholder?: 'blur' | 'empty' | React.ReactNode;
  blurDataURL?: string;
  sizes?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  sx?: object;
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  aspectRatio = '16/9',
  objectFit = 'cover',
  objectPosition = 'center',
  loading = 'lazy',
  placeholder = 'blur',
  blurDataURL,
  sizes,
  priority = false,
  onLoad,
  onError,
  sx = {},
}) => {
  const theme = useTheme();
  const breakpoints = useBreakpoints();
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const [currentSrc, setCurrentSrc] = React.useState<string>('');

  // Determine current aspect ratio
  const getCurrentAspectRatio = React.useMemo(() => {
    if (typeof aspectRatio === 'string') {
      return aspectRatio;
    }

    const breakpointOrder: Breakpoint[] = ['xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(breakpoints.current);

    // Look for exact match first
    if (aspectRatio[breakpoints.current] !== undefined) {
      return aspectRatio[breakpoints.current];
    }

    // Fallback to smaller breakpoints
    for (let i = currentIndex + 1; i < breakpointOrder.length; i++) {
      const breakpoint = breakpointOrder[i];
      if (aspectRatio[breakpoint] !== undefined) {
        return aspectRatio[breakpoint];
      }
    }

    return '16/9'; // Default aspect ratio
  }, [aspectRatio, breakpoints.current]);

  // Determine current image source
  React.useEffect(() => {
    if (typeof src === 'string') {
      setCurrentSrc(src);
      return;
    }

    // Find the best matching source for current breakpoint
    const breakpointOrder: Breakpoint[] = ['xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(breakpoints.current);

    // Look for exact breakpoint match
    let bestSource = src.find(source => source.breakpoint === breakpoints.current);

    // If no exact match, find the closest smaller breakpoint
    if (!bestSource) {
      for (let i = currentIndex + 1; i < breakpointOrder.length; i++) {
        const breakpoint = breakpointOrder[i];
        bestSource = src.find(source => source.breakpoint === breakpoint);
        if (bestSource) break;
      }
    }

    // If still no match, use the first source or fallback
    if (!bestSource) {
      bestSource = src[0] || { src: '' };
    }

    setCurrentSrc(bestSource.src);
  }, [src, breakpoints.current]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
    onLoad?.();
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
    onError?.();
  };

  const generateSrcSet = () => {
    if (typeof src === 'string') {
      return undefined;
    }

    return src
      .filter(source => source.density)
      .map(source => `${source.src} ${source.density}`)
      .join(', ');
  };

  const containerStyles = {
    position: 'relative' as const,
    width: '100%',
    aspectRatio: getCurrentAspectRatio,
    overflow: 'hidden',
    backgroundColor: theme.palette.grey[100],
    ...sx,
  };

  const imageStyles = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit,
    objectPosition,
    transition: theme.transitions.create('opacity', {
      duration: theme.transitions.duration.short,
    }),
    opacity: imageLoaded ? 1 : 0,
  };

  const placeholderStyles = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.palette.grey[200],
    opacity: imageLoaded ? 0 : 1,
    transition: theme.transitions.create('opacity', {
      duration: theme.transitions.duration.short,
    }),
  };

  const renderPlaceholder = () => {
    if (React.isValidElement(placeholder)) {
      return placeholder;
    }

    switch (placeholder) {
      case 'blur':
        return blurDataURL ? (
          <Box
            component="img"
            src={blurDataURL}
            alt=""
            sx={{
              width: '100%',
              height: '100%',
              objectFit,
              objectPosition,
              filter: 'blur(10px)',
              transform: 'scale(1.1)',
            }}
          />
        ) : (
          <Skeleton
            variant="rectangular"
            width="100%"
            height="100%"
            animation="wave"
          />
        );
      case 'empty':
        return null;
      default:
        return (
          <Skeleton
            variant="rectangular"
            width="100%"
            height="100%"
            animation="wave"
          />
        );
    }
  };

  return (
    <Box sx={containerStyles}>
      {/* Placeholder */}
      {!imageLoaded && !imageError && (
        <Box sx={placeholderStyles}>
          {renderPlaceholder()}
        </Box>
      )}

      {/* Error state */}
      {imageError && (
        <Box
          sx={{
            ...placeholderStyles,
            backgroundColor: theme.palette.error.light,
            color: theme.palette.error.contrastText,
            fontSize: '0.875rem',
          }}
        >
          Failed to load image
        </Box>
      )}

      {/* Main image */}
      {currentSrc && (
        <Box
          component="img"
          src={currentSrc}
          srcSet={generateSrcSet()}
          sizes={sizes}
          alt={alt}
          loading={priority ? 'eager' : loading}
          onLoad={handleImageLoad}
          onError={handleImageError}
          sx={imageStyles}
        />
      )}
    </Box>
  );
};

export interface ResponsiveBackgroundImageProps {
  children?: React.ReactNode;
  src: string | ResponsiveImageSource[];
  overlay?: {
    color: string;
    opacity: number;
  };
  parallax?: boolean;
  minHeight?: string | Partial<Record<Breakpoint, string>>;
  sx?: object;
}

export const ResponsiveBackgroundImage: React.FC<ResponsiveBackgroundImageProps> = ({
  children,
  src,
  overlay,
  parallax = false,
  minHeight = '400px',
  sx = {},
}) => {
  const theme = useTheme();
  const breakpoints = useBreakpoints();
  const [currentSrc, setCurrentSrc] = React.useState<string>('');

  // Determine current image source
  React.useEffect(() => {
    if (typeof src === 'string') {
      setCurrentSrc(src);
      return;
    }

    const breakpointOrder: Breakpoint[] = ['xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(breakpoints.current);

    let bestSource = src.find(source => source.breakpoint === breakpoints.current);

    if (!bestSource) {
      for (let i = currentIndex + 1; i < breakpointOrder.length; i++) {
        const breakpoint = breakpointOrder[i];
        bestSource = src.find(source => source.breakpoint === breakpoint);
        if (bestSource) break;
      }
    }

    if (!bestSource) {
      bestSource = src[0] || { src: '' };
    }

    setCurrentSrc(bestSource.src);
  }, [src, breakpoints.current]);

  const getCurrentMinHeight = React.useMemo(() => {
    if (typeof minHeight === 'string') {
      return minHeight;
    }

    const breakpointOrder: Breakpoint[] = ['xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(breakpoints.current);

    if (minHeight[breakpoints.current] !== undefined) {
      return minHeight[breakpoints.current];
    }

    for (let i = currentIndex + 1; i < breakpointOrder.length; i++) {
      const breakpoint = breakpointOrder[i];
      if (minHeight[breakpoint] !== undefined) {
        return minHeight[breakpoint];
      }
    }

    return '400px';
  }, [minHeight, breakpoints.current]);

  const containerStyles = {
    position: 'relative' as const,
    minHeight: getCurrentMinHeight,
    backgroundImage: currentSrc ? `url(${currentSrc})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: parallax ? 'fixed' : 'scroll',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...sx,
  };

  const overlayStyles = overlay ? {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: overlay.color,
    opacity: overlay.opacity,
    zIndex: 1,
  } : {};

  const contentStyles = {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <Box sx={containerStyles}>
      {overlay && <Box sx={overlayStyles} />}
      {children && <Box sx={contentStyles}>{children}</Box>}
    </Box>
  );
};