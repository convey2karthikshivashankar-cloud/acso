import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import { PageErrorBoundary } from '../components/common/ErrorBoundary';

const AgentsPage: React.FC = () => {
  return (
    <PageErrorBoundary>
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Agents Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This page will contain the agent management interface.
          </Typography>
        </Box>
      </Container>
    </PageErrorBoundary>
  );
};

export default AgentsPage;