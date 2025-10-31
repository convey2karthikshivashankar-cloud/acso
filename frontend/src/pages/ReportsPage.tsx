import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import { PageErrorBoundary } from '../components/common/ErrorBoundary';

const ReportsPage: React.FC = () => {
  return (
    <PageErrorBoundary>
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Reports & Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This page will contain reports and analytics dashboards.
          </Typography>
        </Box>
      </Container>
    </PageErrorBoundary>
  );
};

export default ReportsPage;