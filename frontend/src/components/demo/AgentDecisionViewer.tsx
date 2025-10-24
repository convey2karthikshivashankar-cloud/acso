/**
 * Agent Decision Viewer Component
 * 
 * Displays agent decision-making processes with reasoning,
 * confidence levels, and outcome tracking for demo scenarios.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as BrainIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  AgentDecision,
  AgentStatus
} from '../../types/demo';

interface AgentDecisionViewerProps {
  decisions: AgentDecision[];
  agents: AgentStatus[];
  maxDecisions?: number;
  showReasoningDetails?: boolean;
  onDecisionClick?: (decision: AgentDecision) => void;
}

interface DecisionAnalysis {
  averageConfidence: number;
  totalDecisions: number;
  successRate: number;
  decisionsByAgent: Record<string, number>;
  confidenceTrend: number[];
}

const AgentDecisionViewer: React.FC<AgentDecisionViewerProps> = ({
  decisions,
  agents,
  maxDecisions = 10,
  showReasoningDetails = true,
  onDecisionClick
}) => {
  const theme = useTheme();
  const [analysis, setAnalysis] = useState<DecisionAnalysis>({
    averageConfidence: 0,
    totalDecisions: 0,
    successRate: 0,
    decisionsByAgent: {},
    confidenceTrend: []
  });
  const [expandedDecision, setExpandedDecision] = useState<string | null>(null);

  // Analyze decisions
  useEffect(() => {
    if (decisions.length === 0) {
      setAnalysis({
        averageConfidence: 0,
        totalDecisions: 0,
        successRate: 0,
        decisionsByAgent: {},
        confidenceTrend: []
      });
      return;
    }

    const totalConfidence = decisions.reduce((sum, d) => sum + d.confidence, 0);
    const averageConfidence = totalConfidence / decisions.length;
    
    const successfulDecisions = decisions.filter(d => 
      d.outcome?.success !== false
    ).length;
    const successRate = (successfulDecisions / decisions.length) * 100;

    const decisionsByAgent: Record<string, number> = {};
    decisions.forEach(d => {
      decisionsByAgent[d.agentId] = (decisionsByAgent[d.agentId] || 0) + 1;
    });

    const confidenceTrend = decisions
      .slice(-10)
      .map(d => d.confidence * 100);

    setAnalysis({
      averageConfidence: averageConfidence * 100,
      totalDecisions: decisions.length,
      successRate,
      decisionsByAgent,
      confidenceTrend
    });
  }, [decisions]);

  const getAgentName = (agentId: string): string => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || agentId;
  };

  const getAgentColor = (agentId: string): string => {
    const colors = {
      'supervisor': theme.palette.primary.main,
      'threat-hunter': theme.palette.error.main,
      'incident-response': theme.palette.warning.main,
      'financial-intelligence': theme.palette.success.main,
      'service-orchestration': theme.palette.info.main
    };
    
    const agent = agents.find(a => a.id === agentId);
    return colors[agent?.type as keyof typeof colors] || theme.palette.grey[500];
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return theme.palette.success.main;
    if (confidence >= 0.6) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <SuccessIcon />;
    if (confidence >= 0.6) return <WarningIcon />;
    return <ErrorIcon />;
  };

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const handleDecisionExpand = (decisionId: string) => {
    setExpandedDecision(expandedDecision === decisionId ? null : decisionId);
  };

  const recentDecisions = decisions
    .slice(-maxDecisions)
    .reverse(); // Show newest first

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Analysis Summary */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BrainIcon />
            Decision Analysis
          </Typography>
          <Tooltip title="Refresh Analysis">
            <IconButton size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
          {/* Total Decisions */}
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="primary">
                {analysis.totalDecisions}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Decisions
              </Typography>
            </CardContent>
          </Card>

          {/* Average Confidence */}
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography 
                variant="h4" 
                sx={{ color: getConfidenceColor(analysis.averageConfidence / 100) }}
              >
                {Math.round(analysis.averageConfidence)}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Avg Confidence
              </Typography>
            </CardContent>
          </Card>

          {/* Success Rate */}
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main">
                {Math.round(analysis.successRate)}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Success Rate
              </Typography>
            </CardContent>
          </Card>

          {/* Active Agents */}
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="info.main">
                {Object.keys(analysis.decisionsByAgent).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active Agents
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Paper>

      {/* Recent Decisions */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpIcon />
          Recent Decisions ({recentDecisions.length})
        </Typography>

        {recentDecisions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <InfoIcon sx={{ fontSize: 48, color: theme.palette.grey[400], mb: 2 }} />
            <Typography variant="body1" color="textSecondary">
              No decisions recorded yet. Start a demo to see agent decision-making in action.
            </Typography>
          </Box>
        ) : (
          <List>
            {recentDecisions.map((decision, index) => (
              <React.Fragment key={decision.id}>
                <Accordion
                  expanded={expandedDecision === decision.id}
                  onChange={() => handleDecisionExpand(decision.id)}
                  sx={{ 
                    boxShadow: 'none',
                    border: `1px solid ${theme.palette.divider}`,
                    '&:before': { display: 'none' },
                    mb: 1
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      backgroundColor: theme.palette.background.default,
                      borderLeft: `4px solid ${getAgentColor(decision.agentId)}`
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Chip
                        label={getAgentName(decision.agentId)}
                        size="small"
                        sx={{
                          backgroundColor: getAgentColor(decision.agentId),
                          color: 'white'
                        }}
                      />
                      
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" noWrap>
                          {decision.context}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Tooltip title={`Confidence: ${Math.round(decision.confidence * 100)}%`}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {getConfidenceIcon(decision.confidence)}
                            <Typography variant="caption">
                              {Math.round(decision.confidence * 100)}%
                            </Typography>
                          </Box>
                        </Tooltip>
                        
                        <Typography variant="caption" color="textSecondary">
                          {formatTimestamp(decision.timestamp)}
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>

                  {showReasoningDetails && (
                    <AccordionDetails>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Decision Context */}
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Context
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {decision.context}
                          </Typography>
                        </Box>

                        {/* Reasoning */}
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Reasoning
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {decision.reasoning}
                          </Typography>
                        </Box>

                        {/* Options */}
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Options Considered
                          </Typography>
                          <List dense>
                            {decision.options.map((option) => (
                              <ListItem
                                key={option.id}
                                sx={{
                                  backgroundColor: option.id === decision.selectedOption 
                                    ? theme.palette.action.selected 
                                    : 'transparent',
                                  borderRadius: 1,
                                  mb: 0.5
                                }}
                              >
                                <ListItemIcon>
                                  {option.id === decision.selectedOption ? (
                                    <SuccessIcon color="success" />
                                  ) : (
                                    <InfoIcon color="disabled" />
                                  )}
                                </ListItemIcon>
                                <ListItemText
                                  primary={option.description}
                                  secondary={
                                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                      <Chip
                                        label={`${Math.round(option.confidence * 100)}% confidence`}
                                        size="small"
                                        variant="outlined"
                                      />
                                      <Chip
                                        label={`${Math.round(option.risk * 100)}% risk`}
                                        size="small"
                                        variant="outlined"
                                        color={option.risk > 0.7 ? 'error' : option.risk > 0.4 ? 'warning' : 'success'}
                                      />
                                      <Chip
                                        label={option.impact}
                                        size="small"
                                        variant="outlined"
                                      />
                                    </Box>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>

                        {/* Outcome */}
                        {decision.outcome && (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Outcome
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              {decision.outcome.success ? (
                                <SuccessIcon color="success" />
                              ) : (
                                <ErrorIcon color="error" />
                              )}
                              <Typography variant="body2">
                                {decision.outcome.success ? 'Successful' : 'Failed'}
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="textSecondary">
                              {decision.outcome.actualImpact}
                            </Typography>
                            {decision.outcome.learnings && decision.outcome.learnings.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" color="textSecondary">
                                  Key Learnings:
                                </Typography>
                                <List dense>
                                  {decision.outcome.learnings.map((learning, idx) => (
                                    <ListItem key={idx} sx={{ py: 0 }}>
                                      <Typography variant="caption" color="textSecondary">
                                        • {learning}
                                      </Typography>
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            )}
                          </Box>
                        )}

                        {/* Confidence Progress */}
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Confidence Level
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <LinearProgress
                              variant="determinate"
                              value={decision.confidence * 100}
                              sx={{
                                flex: 1,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: theme.palette.grey[200],
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: getConfidenceColor(decision.confidence)
                                }
                              }}
                            />
                            <Typography variant="body2" fontWeight="bold">
                              {Math.round(decision.confidence * 100)}%
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </AccordionDetails>
                  )}
                </Accordion>
                {index < recentDecisions.length - 1 && <Divider sx={{ my: 1 }} />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default AgentDecisionViewer;