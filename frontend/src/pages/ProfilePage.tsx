import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import { PageErrorBoundary } from '../components/common/ErrorBoundary';

const ProfilePage: React.FC = () => {
  return (
    <PageErrorBoundary>
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            User Profile
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This page will contain user profile and account settings.
          </Typography>
        </Box>
      </Container>
    </PageErrorBoundary>
  );
};

export default ProfilePage;