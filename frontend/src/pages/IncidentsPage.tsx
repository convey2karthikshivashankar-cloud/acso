import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import { PageErrorBoundary } from '../components/common/ErrorBoundary';

const IncidentsPage: React.FC = () => {
  return (
    <PageErrorBoundary>
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Incident Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This page will contain the incident management interface.
          </Typography>
        </Box>
      </Container>
    </PageErrorBoundary>
  );
};

export default IncidentsPage;