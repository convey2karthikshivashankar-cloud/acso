import React from 'react';
import { Container } from '@mui/material';
import { PageContainer } from '../components/layout/PageContainer';
import { WorkflowTemplateManager } from '../components/workflow/WorkflowTemplateManager';

const WorkflowsPage: React.FC = () => {
  return (
    <PageContainer title="Workflows" subtitle="Automated workflow management">
      <Container maxWidth="xl">
        <WorkflowTemplateManager />
      </Container>
    </PageContainer>
  );
};

export default WorkflowsPage;