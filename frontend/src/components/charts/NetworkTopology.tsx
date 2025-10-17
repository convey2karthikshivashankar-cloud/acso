import React from 'react';
import { Box, useTheme, Typography, Chip } from '@mui/material';
import { BaseChart, BaseChartProps } from './BaseChart';

export interface NetworkNode {
  id: string;
  label: string;
  type: 'server' | 'client' | 'router' | 'switch' | 'firewall' | 'database' | 'service' | 'unknown';
  status: 'online' | 'offline' | 'warning' | 'error';
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: 'connection' | 'dependency' | 'data_flow' | 'control';
  status: 'active' | 'inactive' | 'error';
  weight?: number;
  bandwidth?: number;
  latency?: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface NetworkTopologyProps extends Omit<BaseChartProps, 'data'> {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  layout?: 'force' | 'circular' | 'hierarchical' | 'grid' | 'manual';
  showLabels?: boolean;
  showStatus?: boolean;
  showMetrics?: boolean;
  nodeSize?: number;
  edgeWidth?: number;
  onNodeClick?: (node: NetworkNode) => void;
  onEdgeClick?: (edge: NetworkEdge) => void;
  onNodeHover?: (node: NetworkNode | null) => void;
  selectedNodes?: string[];
  highlightedPaths?: string[][];
}

export const NetworkTopology: React.FC<NetworkTopologyProps> = ({
  nodes,
  edges,
  layout = 'force',
  showLabels = true,
  showStatus = true,
  showMetrics = false,
  nodeSize = 20,
  edgeWidth = 2,
  onNodeClick,
  onEdgeClick,
  onNodeHover,
  selectedNodes = [],
  highlightedPaths = [],
  config = {},
  ...baseProps
}) => {
  const theme = useTheme();
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = React.useState<NetworkNode | null>(null);
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });

  // Calculate layout positions
  const positionedNodes = React.useMemo(() => {
    return nodes.map((node, index) => {
      if (node.x !== undefined && node.y !== undefined && layout === 'manual') {
        return node;
      }

      let x: number, y: number;

      switch (layout) {
        case 'circular':
          const angle = (2 * Math.PI * index) / nodes.length;
          const radius = Math.min(dimensions.width, dimensions.height) * 0.3;
          x = dimensions.width / 2 + radius * Math.cos(angle);
          y = dimensions.height / 2 + radius * Math.sin(angle);
          break;

        case 'grid':
          const cols = Math.ceil(Math.sqrt(nodes.length));
          const cellWidth = dimensions.width / cols;
          const cellHeight = dimensions.height / Math.ceil(nodes.length / cols);
          x = (index % cols) * cellWidth + cellWidth / 2;
          y = Math.floor(index / cols) * cellHeight + cellHeight / 2;
          break;

        case 'hierarchical':
          // Simple hierarchical layout based on node type
          const levels = ['firewall', 'router', 'switch', 'server', 'client', 'database', 'service'];
          const nodeLevel = levels.indexOf(node.type);
          const nodesAtLevel = nodes.filter(n => levels.indexOf(n.type) === nodeLevel);
          const indexAtLevel = nodesAtLevel.indexOf(node);
          
          y = (nodeLevel + 1) * (dimensions.height / (levels.length + 1));
          x = (indexAtLevel + 1) * (dimensions.width / (nodesAtLevel.length + 1));
          break;

        case 'force':
        default:
          // Simple force-directed layout simulation
          x = Math.random() * (dimensions.width - 100) + 50;
          y = Math.random() * (dimensions.height - 100) + 50;
          break;
      }

      return { ...node, x, y };
    });
  }, [nodes, layout, dimensions]);

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

  const getNodeColor = (node: NetworkNode) => {
    if (node.color) return node.color;

    const statusColors = {
      online: theme.palette.success.main,
      offline: theme.palette.grey[500],
      warning: theme.palette.warning.main,
      error: theme.palette.error.main,
    };

    const typeColors = {
      server: theme.palette.primary.main,
      client: theme.palette.info.main,
      router: theme.palette.secondary.main,
      switch: theme.palette.secondary.light,
      firewall: theme.palette.error.main,
      database: theme.palette.success.main,
      service: theme.palette.warning.main,
      unknown: theme.palette.grey[400],
    };

    return showStatus ? statusColors[node.status] : typeColors[node.type];
  };

  const getEdgeColor = (edge: NetworkEdge) => {
    if (edge.color) return edge.color;

    const statusColors = {
      active: theme.palette.success.main,
      inactive: theme.palette.grey[400],
      error: theme.palette.error.main,
    };

    const typeColors = {
      connection: theme.palette.primary.main,
      dependency: theme.palette.secondary.main,
      data_flow: theme.palette.info.main,
      control: theme.palette.warning.main,
    };

    return statusColors[edge.status] || typeColors[edge.type];
  };

  const isNodeSelected = (nodeId: string) => selectedNodes.includes(nodeId);

  const isEdgeHighlighted = (edge: NetworkEdge) => {
    return highlightedPaths.some(path => {
      const edgeIndex = path.findIndex(nodeId => nodeId === edge.source);
      return edgeIndex !== -1 && path[edgeIndex + 1] === edge.target;
    });
  };

  const handleNodeMouseEnter = (node: NetworkNode, event: React.MouseEvent) => {
    setHoveredNode(node);
    setMousePosition({ x: event.clientX, y: event.clientY });
    onNodeHover?.(node);
  };

  const handleNodeMouseLeave = () => {
    setHoveredNode(null);
    onNodeHover?.(null);
  };

  const renderTooltip = () => {
    if (!hoveredNode) return null;

    return (
      <Box
        sx={{
          position: 'fixed',
          left: mousePosition.x + 10,
          top: mousePosition.y - 10,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          padding: 2,
          boxShadow: theme.shadows[4],
          zIndex: 1000,
          pointerEvents: 'none',
          minWidth: 200,
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          {hoveredNode.label}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <Chip label={hoveredNode.type} size="small" />
          <Chip 
            label={hoveredNode.status} 
            size="small" 
            color={
              hoveredNode.status === 'online' ? 'success' :
              hoveredNode.status === 'warning' ? 'warning' :
              hoveredNode.status === 'error' ? 'error' : 'default'
            }
          />
        </Box>

        {showMetrics && hoveredNode.metadata && (
          <Box>
            {Object.entries(hoveredNode.metadata).map(([key, value]) => (
              <Typography key={key} variant="body2" color="text.secondary">
                {key}: {String(value)}
              </Typography>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  const renderNetwork = () => {
    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          style={{ border: `1px solid ${theme.palette.divider}` }}
        >
          {/* Render edges */}
          {edges.map(edge => {
            const sourceNode = positionedNodes.find(n => n.id === edge.source);
            const targetNode = positionedNodes.find(n => n.id === edge.target);
            
            if (!sourceNode || !targetNode) return null;

            const isHighlighted = isEdgeHighlighted(edge);
            const strokeWidth = isHighlighted ? edgeWidth * 2 : edgeWidth;
            const opacity = isHighlighted ? 1 : 0.6;

            return (
              <line
                key={edge.id}
                x1={sourceNode.x}
                y1={sourceNode.y}
                x2={targetNode.x}
                y2={targetNode.y}
                stroke={getEdgeColor(edge)}
                strokeWidth={strokeWidth}
                opacity={opacity}
                style={{ cursor: onEdgeClick ? 'pointer' : 'default' }}
                onClick={() => onEdgeClick?.(edge)}
              />
            );
          })}

          {/* Render nodes */}
          {positionedNodes.map(node => {
            const isSelected = isNodeSelected(node.id);
            const radius = (node.size || nodeSize) * (isSelected ? 1.5 : 1);
            const strokeWidth = isSelected ? 3 : 1;

            return (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  fill={getNodeColor(node)}
                  stroke={theme.palette.background.paper}
                  strokeWidth={strokeWidth}
                  style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
                  onMouseEnter={(e) => handleNodeMouseEnter(node, e as any)}
                  onMouseLeave={handleNodeMouseLeave}
                  onClick={() => onNodeClick?.(node)}
                />
                
                {showLabels && (
                  <text
                    x={node.x}
                    y={node.y + radius + 15}
                    textAnchor="middle"
                    fill={theme.palette.text.primary}
                    fontSize={12}
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {renderTooltip()}

        {/* Legend */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            padding: 1,
            maxWidth: 200,
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Node Types
          </Typography>
          {Array.from(new Set(nodes.map(n => n.type))).map(type => (
            <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: getNodeColor({ type, status: 'online' } as NetworkNode),
                }}
              />
              <Typography variant="body2">{type}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <BaseChart
      data={[...nodes, ...edges] as any}
      config={{
        ...config,
        title: config.title || 'Network Topology',
      }}
      {...baseProps}
    >
      {renderNetwork()}
    </BaseChart>
  );
};

export default NetworkTopology;