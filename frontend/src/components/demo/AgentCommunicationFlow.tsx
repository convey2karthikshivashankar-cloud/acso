/**
 * Agent Communication Flow Component
 * 
 * Visualizes real-time inter-agent communication and message flows
 * during demo scenarios with animated message paths and status indicators.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Message as MessageIcon,
  Psychology as DecisionIcon,
  Speed as PerformanceIcon,
  Visibility,
  VisibilityOff,
  FilterList
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  AgentStatus,
  AgentMessage,
  AgentDecision,
  MessageFlowVisualization
} from '../../types/demo';

interface AgentCommunicationFlowProps {
  agents: AgentStatus[];
  messages: AgentMessage[];
  decisions: AgentDecision[];
  showMessageFlow?: boolean;
  showDecisionFlow?: boolean;
  height?: number;
  onMessageClick?: (message: AgentMessage) => void;
  onDecisionClick?: (decision: AgentDecision) => void;
}

interface MessageFlowItem {
  id: string;
  type: 'message' | 'decision';
  timestamp: Date;
  fromAgent: string;
  toAgent?: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence?: number;
  status: 'sending' | 'delivered' | 'processed';
}

const AgentCommunicationFlow: React.FC<AgentCommunicationFlowProps> = ({
  agents,
  messages,
  decisions,
  showMessageFlow = true,
  showDecisionFlow = true,
  height = 400,
  onMessageClick,
  onDecisionClick
}) => {
  const theme = useTheme();
  const [flowItems, setFlowItems] = useState<MessageFlowItem[]>([]);
  const [showMessages, setShowMessages] = useState(true);
  const [showDecisions, setShowDecisions] = useState(true);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Convert messages and decisions to flow items
  useEffect(() => {
    const items: MessageFlowItem[] = [];

    if (showMessages && showMessageFlow) {
      messages.forEach(message => {
        items.push({
          id: message.id,
          type: 'message',
          timestamp: message.timestamp,
          fromAgent: message.fromAgent,
          toAgent: message.toAgent,
          content: message.content,
          priority: message.priority,
          status: 'delivered'
        });
      });
    }

    if (showDecisions && showDecisionFlow) {
      decisions.forEach(decision => {
        items.push({
          id: decision.id,
          type: 'decision',
          timestamp: decision.timestamp,
          fromAgent: decision.agentId,
          content: decision.context,
          priority: decision.confidence > 0.8 ? 'high' : 'medium',
          confidence: decision.confidence,
          status: 'processed'
        });
      });
    }

    // Sort by timestamp (newest first)
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Filter by priority if needed
    const filteredItems = filterPriority === 'all' 
      ? items 
      : items.filter(item => item.priority === filterPriority);

    setFlowItems(filteredItems.slice(0, 50)); // Limit to 50 items for performance
  }, [messages, decisions, showMessages, showDecisions, showMessageFlow, showDecisionFlow, filterPriority]);

  // Auto-scroll to newest items
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [flowItems]);

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

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return theme.palette.error.main;
      case 'high': return theme.palette.warning.main;
      case 'medium': return theme.palette.info.main;
      default: return theme.palette.grey[500];
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const handleItemClick = (item: MessageFlowItem) => {
    if (item.type === 'message') {
      const message = messages.find(m => m.id === item.id);
      if (message && onMessageClick) {
        onMessageClick(message);
      }
    } else if (item.type === 'decision') {
      const decision = decisions.find(d => d.id === item.id);
      if (decision && onDecisionClick) {
        onDecisionClick(decision);
      }
    }
  };

  return (
    <Paper elevation={2} sx={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Agent Communication Flow
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Toggle Messages">
              <IconButton
                size="small"
                onClick={() => setShowMessages(!showMessages)}
                color={showMessages ? 'primary' : 'default'}
              >
                <MessageIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Toggle Decisions">
              <IconButton
                size="small"
                onClick={() => setShowDecisions(!showDecisions)}
                color={showDecisions ? 'primary' : 'default'}
              >
                <DecisionIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Filter Priority">
              <IconButton size="small">
                <FilterList />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
          <Chip
            icon={<MessageIcon />}
            label={`${messages.length} Messages`}
            size="small"
            variant="outlined"
          />
          <Chip
            icon={<DecisionIcon />}
            label={`${decisions.length} Decisions`}
            size="small"
            variant="outlined"
          />
          <Chip
            icon={<PerformanceIcon />}
            label={`${agents.filter(a => a.status === 'active').length} Active`}
            size="small"
            variant="outlined"
            color="primary"
          />
        </Box>
      </Box>

      {/* Flow Items */}
      <Box 
        ref={scrollRef}
        sx={{ 
          flex: 1, 
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: theme.palette.grey[100],
          },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.grey[400],
            borderRadius: '3px',
          },
        }}
      >
        <List dense>
          {flowItems.map((item, index) => (
            <React.Fragment key={item.id}>
              <ListItem
                button
                onClick={() => handleItemClick(item)}
                sx={{
                  py: 1,
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                  borderLeft: `4px solid ${getPriorityColor(item.priority)}`,
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.type === 'message' ? (
                    <MessageIcon 
                      sx={{ 
                        color: getAgentColor(item.fromAgent),
                        fontSize: 20 
                      }} 
                    />
                  ) : (
                    <DecisionIcon 
                      sx={{ 
                        color: getAgentColor(item.fromAgent),
                        fontSize: 20 
                      }} 
                    />
                  )}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={getAgentName(item.fromAgent)}
                        size="small"
                        sx={{
                          backgroundColor: getAgentColor(item.fromAgent),
                          color: 'white',
                          fontSize: '0.7rem',
                          height: 20
                        }}
                      />
                      {item.toAgent && (
                        <>
                          <Typography variant="caption" color="textSecondary">
                            →
                          </Typography>
                          <Chip
                            label={getAgentName(item.toAgent)}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: getAgentColor(item.toAgent),
                              color: getAgentColor(item.toAgent),
                              fontSize: '0.7rem',
                              height: 20
                            }}
                          />
                        </>
                      )}
                      <Typography variant="caption" color="textSecondary">
                        {formatTimestamp(item.timestamp)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          mt: 0.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {item.content}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={item.priority.toUpperCase()}
                          size="small"
                          sx={{
                            backgroundColor: getPriorityColor(item.priority),
                            color: 'white',
                            fontSize: '0.6rem',
                            height: 16
                          }}
                        />
                        {item.confidence && (
                          <Chip
                            label={`${Math.round(item.confidence * 100)}% confidence`}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontSize: '0.6rem',
                              height: 16
                            }}
                          />
                        )}
                        <Chip
                          label={item.status}
                          size="small"
                          variant="outlined"
                          color={item.status === 'processed' ? 'success' : 'default'}
                          sx={{
                            fontSize: '0.6rem',
                            height: 16
                          }}
                        />
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
              {index < flowItems.length - 1 && <Divider />}
            </React.Fragment>
          ))}
          
          {flowItems.length === 0 && (
            <ListItem>
              <ListItemText
                primary={
                  <Typography variant="body2" color="textSecondary" textAlign="center">
                    No communication activity yet. Start a demo to see agent interactions.
                  </Typography>
                }
              />
            </ListItem>
          )}
        </List>
      </Box>
    </Paper>
  );
};

export default AgentCommunicationFlow;