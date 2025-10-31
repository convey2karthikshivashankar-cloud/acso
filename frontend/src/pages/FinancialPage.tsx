import React from 'react';
import { Container } from '@mui/material';
import { PageContainer } from '../components/layout/PageContainer';
import { CostAnalysisDashboard } from '../components/financial/CostAnalysisDashboard';

const FinancialPage: React.FC = () => {
  return (
    <PageContainer title="Financial Analytics" subtitle="ROI analysis and cost optimization">
      <Container maxWidth="xl">
        <CostAnalysisDashboard />
      </Container>
    </PageContainer>
  );
};

export default FinancialPage;