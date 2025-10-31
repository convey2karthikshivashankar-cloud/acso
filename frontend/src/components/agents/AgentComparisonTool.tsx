import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Close,
  TrendingUp,
  TrendingDown,
  Remove,
  CheckCircle,
  Warning,
  Error,
  Circle,
} from '@mui/icons-material';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { Agent } from './EnhancedAgentOverview';

// Props interface
export interface AgentComparisonToolProps {
  agents: Agent[];
  onRemoveAgent?: (agentId: string) => void;
  onClose?: () => void;
}

export const AgentComparisonTool: React.FC<AgentComparisonToolProps> = ({
  agents,
  onRemoveAgent,
  onClose,
}) => {
  // Agent type configurations
  const agentTypeConfig = {
    supervisor: { color: '#2196F3', label: 'Supervisor' },
    threat_hunter: { color: '#F44336', label: 'Threat Hunter' },
    incident_response: { color: '#FF9800', label: 'Incident Response' },
    service_orchestration: { color: '#4CAF50', label: 'Service Orchestration' },
    financial_intelligence: { color: '#9C27B0', label: 'Financial Intelligence' },
  };

  // Status configurations
  const statusConfig = {
    online: { icon: <CheckCircle />, color: '#4CAF50', label: 'Online' },
    offline: { icon: <Circle />, color: '#757575', label: 'Offline' },
    warning: { icon: <Warning />, color: '#FF9800', label: 'Warning' },
    error: { icon: <Error />, color: '#F44336', label: 'Error' },
    maintenance: { icon: <Circle />, color: '#2196F3', label: 'Maintenance' },
  };

  // Prepare radar chart data
  const radarData = useMemo(() => {
    const metrics = ['CPU', 'Memory', 'Uptime', 'Tasks', 'Response Time'];
    
    return metrics.map(metric => {
      const dataPoint: any = { metric };
      
      agents.forEach((agent, index) => {
        let value: number;
        switch (metric) {
          case 'CPU':
            value = agent.performance.cpu;
            break;
          case 'Memory':
            value = agent.performance.memory;
            break;
          case 'Uptime':
            value = Math.min(100, (agent.performance.uptime / (24 * 3600)) * 100); // Normalize to 0-100
            break;
          case 'Tasks':
            value = Math.min(100, (agent.performance.tasksCompleted / 1000) * 100); // Normalize to 0-100
            break;
          case 'Response Time':
            value = Math.max(0, 100 - (agent.performance.avgResponseTime / 10)); // Invert and normalize
            break;
          default:
            value = 0;
        }
        dataPoint[`agent${index}`] = value;
      });
      
      return dataPoint;
    });
  }, [agents]);

  // Prepare performance comparison data
  const performanceData = useMemo(() => {
    return agents.map((agent, index) => ({
      name: agent.name,
      cpu: agent.performance.cpu,
      memory: agent.performance.memory,
      uptime: Math.min(100, (agent.performance.uptime / (24 * 3600)) * 100),
      tasks: Math.min(100, (agent.performance.tasksCompleted / 1000) * 100),
      responseTime: Math.max(0, 100 - (agent.performance.avgResponseTime / 10)),
      color: agentTypeConfig[agent.type]?.color || '#666',
    }));
  }, [agents]);

  // Calculate performance scores
  const performanceScores = useMemo(() => {
    return agents.map(agent => {
      const cpu = 100 - agent.performance.cpu; // Lower CPU usage is better
      const memory = 100 - agent.performance.memory; // Lower memory usage is better
      const uptime = Math.min(100, (agent.performance.uptime / (24 * 3600)) * 100);
      const tasks = Math.min(100, (agent.performance.tasksCompleted / 1000) * 100);
      const responseTime = Math.max(0, 100 - (agent.performance.avgResponseTime / 10));
      
      const score = (cpu + memory + uptime + tasks + responseTime) / 5;
      
      return {
        agentId: agent.id,
        score: Math.round(score),
        rank: 0, // Will be set after sorting
      };
    });
  }, [agents]);

  // Rank agents by performance
  const rankedAgents = useMemo(() => {
    const sorted = [...performanceScores].sort((a, b) => b.score - a.score);
    return sorted.map((item, index) => ({ ...item, rank: index + 1 }));
  }, [performanceScores]);

  // Get comparison insights
  const insights = useMemo(() => {
    if (agents.length < 2) return [];

    const insights: string[] = [];
    
    // CPU comparison
    const cpuValues = agents.map(a => a.performance.cpu);
    const maxCpu = Math.max(...cpuValues);
    const minCpu = Math.min(...cpuValues);
    const maxCpuAgent = agents.find(a => a.performance.cpu === maxCpu);
    const minCpuAgent = agents.find(a => a.performance.cpu === minCpu);
    
    if (maxCpu - minCpu > 20) {
      insights.push(`${maxCpuAgent?.name} has significantly higher CPU usage (${maxCpu}%) compared to ${minCpuAgent?.name} (${minCpu}%)`);
    }

    // Memory comparison
    const memoryValues = agents.map(a => a.performance.memory);
    const maxMemory = Math.max(...memoryValues);
    const minMemory = Math.min(...memoryValues);
    const maxMemoryAgent = agents.find(a => a.performance.memory === maxMemory);
    const minMemoryAgent = agents.find(a => a.performance.memory === minMemory);
    
    if (maxMemory - minMemory > 20) {
      insights.push(`${maxMemoryAgent?.name} uses ${maxMemory - minMemory}% more memory than ${minMemoryAgent?.name}`);
    }

    // Status comparison
    const onlineAgents = agents.filter(a => a.status === 'online').length;
    const totalAgents = agents.length;
    
    if (onlineAgents < totalAgents) {
      insights.push(`${totalAgents - onlineAgents} out of ${totalAgents} agents are not online`);
    }

    // Type diversity
    const types = new Set(agents.map(a => a.type));
    if (types.size === agents.length) {
      insights.push('All agents have different types, providing diverse capabilities');
    }

    return insights;
  }, [agents]);

  if (agents.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="textSecondary">
          No agents selected for comparison
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Select agents from the overview to compare their performance and capabilities
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          Agent Comparison ({agents.length} agents)
        </Typography>
        {onClose && (
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        )}
      </Box>

      {/* Agent Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {agents.map((agent, index) => {
          const typeConfig = agentTypeConfig[agent.type];
          const statusConf = statusConfig[agent.status];
          const rank = rankedAgents.find(r => r.agentId === agent.id)?.rank || 0;
          const score = rankedAgents.find(r => r.agentId === agent.id)?.score || 0;

          return (
            <Grid item xs={12} sm={6} md={3} key={agent.id}>
              <Card sx={{ position: 'relative' }}>
                <CardContent>
                  {onRemoveAgent && (
                    <IconButton
                      size="small"
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                      onClick={() => onRemoveAgent(agent.id)}
                    >
                      <Close />
                    </IconButton>
                  )}
                  
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Avatar sx={{ bgcolor: typeConfig?.color, width: 32, height: 32 }}>
                      {statusConf.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" noWrap>
                        {agent.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Rank #{rank} (Score: {score})
                      </Typography>
                    </Box>
                  </Box>

                  <Chip
                    label={typeConfig?.label}
                    size="small"
                    sx={{ mb: 1, bgcolor: typeConfig?.color, color: 'white' }}
                  />

                  <Box mt={2}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption">CPU</Typography>
                      <Typography variant="caption">{agent.performance.cpu}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={agent.performance.cpu}
                      color={agent.performance.cpu > 80 ? 'error' : agent.performance.cpu > 60 ? 'warning' : 'success'}
                    />
                  </Box>

                  <Box mt={1}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption">Memory</Typography>
                      <Typography variant="caption">{agent.performance.memory}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={agent.performance.memory}
                      color={agent.performance.memory > 80 ? 'error' : agent.performance.memory > 60 ? 'warning' : 'success'}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Grid container spacing={3}>
        {/* Performance Radar Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Radar
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    {agents.map((agent, index) => (
                      <Radar
                        key={agent.id}
                        name={agent.name}
                        dataKey={`agent${index}`}
                        stroke={agentTypeConfig[agent.type]?.color || '#666'}
                        fill={agentTypeConfig[agent.type]?.color || '#666'}
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Bar Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="cpu" name="CPU %" fill="#FF6B6B" />
                    <Bar dataKey="memory" name="Memory %" fill="#4ECDC4" />
                    <Bar dataKey="uptime" name="Uptime %" fill="#45B7D1" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Detailed Comparison Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detailed Comparison
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Agent</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>CPU %</TableCell>
                      <TableCell>Memory %</TableCell>
                      <TableCell>Uptime (hrs)</TableCell>
                      <TableCell>Tasks Completed</TableCell>
                      <TableCell>Avg Response (ms)</TableCell>
                      <TableCell>Performance Score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {agents.map(agent => {
                      const typeConfig = agentTypeConfig[agent.type];
                      const statusConf = statusConfig[agent.status];
                      const score = rankedAgents.find(r => r.agentId === agent.id)?.score || 0;
                      const rank = rankedAgents.find(r => r.agentId === agent.id)?.rank || 0;

                      return (
                        <TableRow key={agent.id}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Avatar sx={{ bgcolor: typeConfig?.color, width: 24, height: 24 }}>
                                {statusConf.icon}
                              </Avatar>
                              {agent.name}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={typeConfig?.label}
                              size="small"
                              sx={{ bgcolor: typeConfig?.color, color: 'white' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={statusConf.label}
                              size="small"
                              color={agent.status === 'online' ? 'success' : 
                                     agent.status === 'warning' ? 'warning' : 
                                     agent.status === 'error' ? 'error' : 'default'}
                            />
                          </TableCell>
                          <TableCell>{agent.location}</TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {agent.performance.cpu}%
                              {agent.performance.cpu > 80 ? <TrendingUp color="error" /> : 
                               agent.performance.cpu > 60 ? <TrendingUp color="warning" /> : 
                               <TrendingDown color="success" />}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {agent.performance.memory}%
                              {agent.performance.memory > 80 ? <TrendingUp color="error" /> : 
                               agent.performance.memory > 60 ? <TrendingUp color="warning" /> : 
                               <TrendingDown color="success" />}
                            </Box>
                          </TableCell>
                          <TableCell>{Math.floor(agent.performance.uptime / 3600)}</TableCell>
                          <TableCell>{agent.performance.tasksCompleted.toLocaleString()}</TableCell>
                          <TableCell>{agent.performance.avgResponseTime}</TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Chip
                                label={`#${rank}`}
                                size="small"
                                color={rank === 1 ? 'success' : rank <= 3 ? 'warning' : 'default'}
                              />
                              {score}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Insights */}
        {insights.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Comparison Insights
                </Typography>
                <Box>
                  {insights.map((insight, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                      • {insight}
                    </Typography>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default AgentComparisonTool;