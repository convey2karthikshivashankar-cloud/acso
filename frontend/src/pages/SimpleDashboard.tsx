import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Psychology as AgentIcon,
  AttachMoney as FinancialIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

export const SimpleDashboard: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            fontWeight: 700, 
            mb: 2,
            color: 'primary.main',
            textAlign: 'center'
          }}
        >
          🛡️ ACSO Enterprise Dashboard
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary"
          sx={{ textAlign: 'center', mb: 4 }}
        >
          Autonomous Cyber-Security & Service Orchestrator
        </Typography>
      </Box>

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', textAlign: 'center' }}>
            <CardContent>
              <SecurityIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                3
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Active Threats
              </Typography>
              <Chip 
                label="Critical" 
                color="error" 
                size="small" 
                sx={{ mt: 1 }} 
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', textAlign: 'center' }}>
            <CardContent>
              <AgentIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                15
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Active Agents
              </Typography>
              <Chip 
                label="Online" 
                color="success" 
                size="small" 
                sx={{ mt: 1 }} 
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', textAlign: 'center' }}>
            <CardContent>
              <WarningIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                8
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Open Incidents
              </Typography>
              <Chip 
                label="Investigating" 
                color="warning" 
                size="small" 
                sx={{ mt: 1 }} 
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', textAlign: 'center' }}>
            <CardContent>
              <FinancialIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                $125K
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Monthly Savings
              </Typography>
              <Chip 
                label="+18%" 
                color="success" 
                size="small" 
                sx={{ mt: 1 }} 
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Status Sections */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              System Health
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">CPU Usage</Typography>
                <Typography variant="body2">45%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={45} sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Memory Usage</Typography>
                <Typography variant="body2">68%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={68} sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Network Load</Typography>
                <Typography variant="body2">32%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={32} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Recent Activity
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip label="ALERT" color="error" size="small" />
                <Typography variant="body2">
                  Suspicious login detected from IP 192.168.1.100
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip label="INFO" color="info" size="small" />
                <Typography variant="body2">
                  Agent deployment completed successfully
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip label="SUCCESS" color="success" size="small" />
                <Typography variant="body2">
                  Threat mitigation workflow executed
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip label="WARNING" color="warning" size="small" />
                <Typography variant="body2">
                  High memory usage on server node-03
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Live Data Indicator */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          🔄 Live data simulation active • Last updated: {new Date().toLocaleTimeString()}
        </Typography>
      </Box>
    </Box>
  );
};