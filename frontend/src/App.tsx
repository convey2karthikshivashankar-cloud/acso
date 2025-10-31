import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Grid,
  Chip
} from '@mui/material';
import {
  Shield as ShieldIcon,
  Security as SecurityIcon,
  Psychology as AgentIcon,
  AttachMoney as FinancialIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { EnhancedEnterpriseDashboard } from './components/EnhancedEnterpriseDashboard';

// Create enhanced Material-UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#ff6b35',
    },
    success: {
      main: '#4caf50',
    },
    warning: {
      main: '#ff9800',
    },
    error: {
      main: '#f44336',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'box-shadow 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          },
        },
      },
    },
  },
});

// Enhanced Landing Page with Rich Content
const LoginPage: React.FC = () => {
  const [currentFeature, setCurrentFeature] = useState(0);
  
  const features = [
    {
      title: "Autonomous Threat Detection",
      description: "AI-powered agents continuously monitor and detect threats in real-time",
      icon: <SecurityIcon sx={{ fontSize: 60 }} />,
      stats: "99.7% Detection Rate"
    },
    {
      title: "Intelligent Incident Response", 
      description: "Automated response workflows that contain threats within seconds",
      icon: <WarningIcon sx={{ fontSize: 60 }} />,
      stats: "< 30s Response Time"
    },
    {
      title: "Financial Intelligence",
      description: "Smart cost optimization and ROI analysis for maximum efficiency",
      icon: <FinancialIcon sx={{ fontSize: 60 }} />,
      stats: "285% Average ROI"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Elements */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.1,
        background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.4"%3E%3Ccircle cx="7" cy="7" r="7"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
      }} />
      
      <Grid container maxWidth="lg" sx={{ mx: 'auto', px: 3 }}>
        <Grid item xs={12} md={6} sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ color: 'white', pr: { md: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <ShieldIcon sx={{ fontSize: 50, mr: 2 }} />
              <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold' }}>
                ACSO
              </Typography>
            </Box>
            
            <Typography variant="h4" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
              Autonomous Cyber-Security & Service Orchestrator
            </Typography>
            
            <Typography variant="h6" sx={{ mb: 4, opacity: 0.9, lineHeight: 1.6 }}>
              Transform your IT operations with AI-powered agents that proactively detect threats, 
              orchestrate responses, and optimize costs - all while you focus on strategic growth.
            </Typography>

            {/* Feature Showcase */}
            <Card sx={{ 
              mb: 4, 
              background: 'rgba(255,255,255,0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              transition: 'all 0.5s ease-in-out'
            }}>
              <CardContent sx={{ color: 'white', textAlign: 'center', py: 3 }}>
                <Box sx={{ color: 'primary.light', mb: 2 }}>
                  {features[currentFeature].icon}
                </Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  {features[currentFeature].title}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                  {features[currentFeature].description}
                </Typography>
                <Chip 
                  label={features[currentFeature].stats}
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
              </CardContent>
            </Card>

            {/* Feature Indicators */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
              {features.map((_, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: currentFeature === index ? 'white' : 'rgba(255,255,255,0.3)',
                    mx: 0.5,
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </Box>

            <Button
              component={Link}
              to="/dashboard"
              variant="contained"
              size="large"
              sx={{ 
                py: 2,
                px: 4,
                fontSize: '1.1rem',
                fontWeight: 'bold',
                bgcolor: 'white',
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.9)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              Experience Live Demo →
            </Button>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: 'rgba(255,255,255,0.95)', 
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
                🚀 Live Demo Features
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <AgentIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>15+</Typography>
                    <Typography variant="body2" color="text.secondary">AI Agents</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <SecurityIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>1,200+</Typography>
                    <Typography variant="body2" color="text.secondary">Threats Blocked</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <FinancialIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>$450K</Typography>
                    <Typography variant="body2" color="text.secondary">Cost Savings</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <WarningIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>12</Typography>
                    <Typography variant="body2" color="text.secondary">Active Incidents</Typography>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  ✨ <strong>Interactive Demo</strong> • Real-time data simulation • 
                  Multi-agent coordination • Financial intelligence • Threat response workflows
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<EnhancedEnterpriseDashboard />} />
          <Route path="/dashboard" element={<EnhancedEnterpriseDashboard />} />
          <Route path="*" element={<EnhancedEnterpriseDashboard />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;