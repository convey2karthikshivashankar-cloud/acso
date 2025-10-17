import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Chip,
  Switch,
  FormControlLabel,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import {
  MoreVert,
  Refresh,
  Fullscreen,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  ViewModule,
  AccountTree,
  Hub,
} from '@mui/icons-material';
import { Agent } from './AgentOverview';

export interface AgentConnection {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  type: 'communication' | 'dependency' | 'data_flow' | 'supervision';
  status: 'active' | 'inactive' | 'error';
  bandwidth?: number;
  latency?: number;
  messageCount?: number;
  lastActivity?: Date;
}

export interface AgentTopologyProps {
  agents: Agent[];
  connections: AgentConnection[];
  layout?: 'hierarchical' | 'circular' | 'force' | 'grid';
  showLabels?: boolean;
  showMetrics?: boolean;
  showConnections?: boolean;
  onAgentClick?: (agent: Agent) => void;
  onConnectionClick?: (connection: AgentConnection) => void;
  onLayoutChange?: (layout: string) => void;
}

export const AgentTopology: React.FC<AgentTopologyProps> = ({
  agents,
  connections,
  layout = 'hierarchical',
  showLabels = true,
  showMetrics = false,
  showConnections = true,
  onAgentClick,
  onConnectionClick,
  onLayoutChange,
}) => {
  const theme = useTheme();
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 600 });
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [selectedAgent, setSelectedAgent] = React.useState<Agent | null>(null);
  const [hoveredAgent, setHoveredAgent] = React.useState<Agent | null>(null);
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);

  // Calculate agent positions based on layout
  const agentPositions = React.useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();

    switch (layout) {
      case 'hierarchical':
        // Arrange agents by type hierarchy
        const hierarchy = {
          supervisor: 0,
          threat_hunter: 1,
          incident_response: 1,
          service_orchestration: 1,
          financial_intelligence: 1,
        };

        const levelCounts = new Map<number, number>();
        const levelAgents = new Map<number, Agent[]>();

        agents.forEach(agent => {
          const level = hierarchy[agent.type] || 2;
          if (!levelAgents.has(level)) {
            levelAgents.set(level, []);
            levelCounts.set(level, 0);
          }
          levelAgents.get(level)!.push(agent);
        });

        levelAgents.forEach((levelAgentList, level) => {
          const y = (level + 1) * (dimensions.height / (Math.max(...Array.from(levelCounts.keys())) + 2));
          levelAgentList.forEach((agent, index) => {
            const x = (index + 1) * (dimensions.width / (levelAgentList.length + 1));
            positions.set(agent.id, { x, y });
          });
        });
        break;

      case 'circular':
        agents.forEach((agent, index) => {
          const angle = (2 * Math.PI * index) / agents.length;
          const radius = Math.min(dimensions.width, dimensions.height) * 0.3;
          const x = dimensions.width / 2 + radius * Math.cos(angle);
          const y = dimensions.height / 2 + radius * Math.sin(angle);
          positions.set(agent.id, { x, y });
        });
        break;

      case 'grid':
        const cols = Math.ceil(Math.sqrt(agents.length));
        const cellWidth = dimensions.width / cols;
        const cellHeight = dimensions.height / Math.ceil(agents.length / cols);
        
        agents.forEach((agent, index) => {
          const x = (index % cols) * cellWidth + cellWidth / 2;
          const y = Math.floor(index / cols) * cellHeight + cellHeight / 2;
          positions.set(agent.id, { x, y });
        });
        break;

      case 'force':
      default:
        // Simple force-directed layout simulation
        agents.forEach((agent, index) => {
          const x = Math.random() * (dimensions.width - 100) + 50;
          const y = Math.random() * (dimensions.height - 100) + 50;
          positions.set(agent.id, { x, y });
        });
        break;
    }

    return positions;
  }, [agents, layout, dimensions]);

  // Update dimensions on resize
  React.useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const getAgentColor = (agent: Agent) => {
    const statusColors = {
      online: theme.palette.success.main,
      offline: theme.palette.grey[500],
      warning: theme.palette.warning.main,
      error: theme.palette.error.main,
      maintenance: theme.palette.info.main,
    };

    return statusColors[agent.status];
  };

  const getConnectionColor = (connection: AgentConnection) => {
    const statusColors = {
      active: theme.palette.success.main,
      inactive: theme.palette.grey[400],
      error: theme.palette.error.main,
    };

    const typeColors = {
      communication: theme.palette.primary.main,
      dependency: theme.palette.secondary.main,
      data_flow: theme.palette.info.main,
      supervision: theme.palette.warning.main,
    };

    return statusColors[connection.status] || typeColors[connection.type];
  };

  const getConnectionWidth = (connection: AgentConnection) => {
    if (connection.bandwidth) {
      return Math.max(1, Math.min(5, connection.bandwidth / 100));
    }
    return 2;
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
    onAgentClick?.(agent);
  };

  const handleAgentHover = (agent: Agent | null) => {
    setHoveredAgent(agent);
  };

  const renderControls = () => (
    <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}>
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
        <Tooltip title="Zoom In">
          <IconButton size="small" onClick={handleZoomIn}>
            <ZoomIn />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom Out">
          <IconButton size="small" onClick={handleZoomOut}>
            <ZoomOut />
          </IconButton>
        </Tooltip>
        <Tooltip title="Reset Zoom">
          <IconButton size="small" onClick={handleResetZoom}>
            <CenterFocusStrong />
          </IconButton>
        </Tooltip>
        <Tooltip title="Options">
          <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MoreVert />
          </IconButton>
        </Tooltip>
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => onLayoutChange?.('hierarchical')}>
          <AccountTree sx={{ mr: 1 }} />
          Hierarchical
        </MenuItem>
        <MenuItem onClick={() => onLayoutChange?.('circular')}>
          <Hub sx={{ mr: 1 }} />
          Circular
        </MenuItem>
        <MenuItem onClick={() => onLayoutChange?.('grid')}>
          <ViewModule sx={{ mr: 1 }} />
          Grid
        </MenuItem>
        <MenuItem onClick={() => onLayoutChange?.('force')}>
          <CenterFocusStrong sx={{ mr: 1 }} />
          Force Directed
        </MenuItem>
      </Menu>
    </Box>
  );

  const renderLegend = () => (
    <Box
      sx={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        backgroundColor: alpha(theme.palette.background.paper, 0.9),
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        padding: 2,
        minWidth: 200,
      }}
    >
      <Typography variant="subtitle2" gutterBottom>
        Agent Types
      </Typography>
      {Array.from(new Set(agents.map(a => a.type))).map(type => (
        <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: theme.palette.primary.main,
            }}
          />
          <Typography variant="body2">
            {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Typography>
        </Box>
      ))}

      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        Connection Types
      </Typography>
      {['communication', 'dependency', 'data_flow', 'supervision'].map(type => (
        <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 2,
              backgroundColor: getConnectionColor({ type } as AgentConnection),
            }}
          />
          <Typography variant="body2">
            {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Typography>
        </Box>
      ))}
    </Box>
  );

  const renderTopology = () => (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ border: `1px solid ${theme.palette.divider}` }}
      >
        <g transform={`scale(${zoomLevel})`}>
          {/* Render connections */}
          {showConnections && connections.map(connection => {
            const sourcePos = agentPositions.get(connection.sourceAgentId);
            const targetPos = agentPositions.get(connection.targetAgentId);
            
            if (!sourcePos || !targetPos) return null;

            const isHighlighted = hoveredAgent && 
              (hoveredAgent.id === connection.sourceAgentId || hoveredAgent.id === connection.targetAgentId);

            return (
              <g key={connection.id}>
                <line
                  x1={sourcePos.x}
                  y1={sourcePos.y}
                  x2={targetPos.x}
                  y2={targetPos.y}
                  stroke={getConnectionColor(connection)}
                  strokeWidth={getConnectionWidth(connection)}
                  opacity={isHighlighted ? 1 : 0.6}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onConnectionClick?.(connection)}
                />
                
                {/* Connection metrics */}
                {showMetrics && connection.latency && (
                  <text
                    x={(sourcePos.x + targetPos.x) / 2}
                    y={(sourcePos.y + targetPos.y) / 2}
                    fill={theme.palette.text.secondary}
                    fontSize={10}
                    textAnchor="middle"
                    style={{ pointerEvents: 'none' }}
                  >
                    {connection.latency}ms
                  </text>
                )}
              </g>
            );
          })}

          {/* Render agents */}
          {agents.map(agent => {
            const position = agentPositions.get(agent.id);
            if (!position) return null;

            const isSelected = selectedAgent?.id === agent.id;
            const isHovered = hoveredAgent?.id === agent.id;
            const radius = 25 + (isSelected ? 5 : 0) + (isHovered ? 3 : 0);

            return (
              <g key={agent.id}>
                {/* Agent circle */}
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={radius}
                  fill={getAgentColor(agent)}
                  stroke={theme.palette.background.paper}
                  strokeWidth={isSelected ? 4 : 2}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => handleAgentHover(agent)}
                  onMouseLeave={() => handleAgentHover(null)}
                  onClick={() => handleAgentClick(agent)}
                />

                {/* Agent status indicator */}
                <circle
                  cx={position.x + 15}
                  cy={position.y - 15}
                  r={6}
                  fill={getAgentColor(agent)}
                  stroke={theme.palette.background.paper}
                  strokeWidth={2}
                  style={{ pointerEvents: 'none' }}
                />

                {/* Agent label */}
                {showLabels && (
                  <text
                    x={position.x}
                    y={position.y + radius + 15}
                    fill={theme.palette.text.primary}
                    fontSize={12}
                    textAnchor="middle"
                    style={{ pointerEvents: 'none' }}
                  >
                    {agent.name}
                  </text>
                )}

                {/* Health score */}
                {showMetrics && (
                  <text
                    x={position.x}
                    y={position.y + 4}
                    fill={theme.palette.background.paper}
                    fontSize={10}
                    textAnchor="middle"
                    fontWeight="bold"
                    style={{ pointerEvents: 'none' }}
                  >
                    {agent.health.score}%
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {renderControls()}
      {renderLegend()}
    </Box>
  );

  return (
    <Card sx={{ height: 600 }}>
      <CardHeader
        title="Agent Topology"
        subheader={`${agents.length} agents, ${connections.length} connections`}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showLabels}
                  onChange={(e) => {
                    // Handle show labels toggle
                  }}
                  size="small"
                />
              }
              label="Labels"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showMetrics}
                  onChange={(e) => {
                    // Handle show metrics toggle
                  }}
                  size="small"
                />
              }
              label="Metrics"
            />
            <Chip label={layout} size="small" />
          </Box>
        }
      />
      <CardContent sx={{ height: 'calc(100% - 80px)', p: 0, position: 'relative' }}>
        {renderTopology()}
      </CardContent>
    </Card>
  );
};

export default AgentTopology;