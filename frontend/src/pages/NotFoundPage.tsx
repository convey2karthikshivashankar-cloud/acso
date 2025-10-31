import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Container,
  Paper,
  useTheme
} from '@mui/material';
import { 
  HomeRounded, 
  ArrowBackRounded, 
  SearchRounded,
  ErrorOutlineRounded 
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEnhancedNavigation } from '../components/routing/EnhancedRouter';

const NotFoundPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { navigate: enhancedNavigate } = useEnhancedNavigation();

  const handleGoHome = () => {
    enhancedNavigate('/', {
      analytics: {
        category: 'Navigation',
        action: '404 Go Home',
        label: location.pathname
      }
    });
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleSearch = () => {
    enhancedNavigate('/search', {
      state: { query: location.pathname },
      analytics: {
        category: 'Navigation',
        action: '404 Search',
        label: location.pathname
      }
    });
  };

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
          }}
        >
          <ErrorOutlineRounded
            sx={{
              fontSize: 120,
              color: 'primary.main',
              mb: 3,
              opacity: 0.8,
            }}
          />
          
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '4rem', md: '6rem' },
              fontWeight: 'bold',
              color: 'primary.main',
              mb: 2,
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            404
          </Typography>
          
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              mb: 2,
              fontWeight: 500,
            }}
          >
            Page Not Found
          </Typography>
          
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              mb: 4,
              maxWidth: 500,
              mx: 'auto',
              lineHeight: 1.6,
            }}
          >
            The page you're looking for doesn't exist or has been moved. 
            Don't worry, it happens to the best of us. Let's get you back on track.
          </Typography>

          <Box
            sx={{
              mb: 4,
              p: 2,
              backgroundColor: 'action.hover',
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              color: 'text.secondary',
            }}
          >
            Requested URL: {location.pathname}
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Button
              variant="contained"
              size="large"
              startIcon={<HomeRounded />}
              onClick={handleGoHome}
              sx={{
                minWidth: 160,
                py: 1.5,
              }}
            >
              Go Home
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              startIcon={<ArrowBackRounded />}
              onClick={handleGoBack}
              sx={{
                minWidth: 160,
                py: 1.5,
              }}
            >
              Go Back
            </Button>
            
            <Button
              variant="text"
              size="large"
              startIcon={<SearchRounded />}
              onClick={handleSearch}
              sx={{
                minWidth: 160,
                py: 1.5,
              }}
            >
              Search
            </Button>
          </Box>

          <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              If you believe this is an error, please{' '}
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  window.location.href = 'mailto:support@acso.com?subject=404 Error Report&body=URL: ' + location.pathname;
                }}
                sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
              >
                contact support
              </Button>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default NotFoundPage;