import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Toolbar,
  ButtonGroup,
  Button,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  ZoomOutMap,
  CenterFocusStrong,
  Settings,
  Fullscreen,
  FullscreenExit,
  PlayArrow,
  Pause,
  Refresh,
  FilterList,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';

// Network node interface
export interface NetworkNode {
  id: string;
  label: string;
  type: 'server' | 'router' | 'switch' | 'firewall' | 'endpoint' | 'cloud' | 'database';
  status: 'online' | 'offline' | 'warning' | 'critical';
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  metadata?: Record<string, any>;
  group?: string;
}

// Network edge interface
export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: 'ethernet' | 'wifi' | 'vpn' | 'internet' | 'internal';
  status: 'active' | 'inactive' | 'congested' | 'error';
  bandwidth?: number;
  latency?: number;
  utilization?: number;
  color?: string;
  width?: number;
  animated?: boolean;
}

// Layout algorithms
export type LayoutAlgorithm = 'force' | 'hierarchical' | 'circular' | 'grid' | 'radial';

// Props interface
export interface AdvancedNetworkTopologyProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  width?: number;
  height?: number;
  layout?: LayoutAlgorithm;
  enableZoom?: boolean;
  enablePan?: boolean;
  enableDrag?: boolean;
  realTime?: boolean;
  updateInterval?: number;
  onNodeClick?: (node: NetworkNode) => void;
  onEdgeClick?: (edge: NetworkEdge) => void;
  onSelectionChange?: (selectedNodes: NetworkNode[], selectedEdges: NetworkEdge[]) => void;
}

export const AdvancedNetworkTopology: React.FC<AdvancedNetworkTopologyProps> = ({
  nodes,
  edges,
  width = 800,
  height = 600,
  layout = 'force',
  enableZoom = true,
  enablePan = true,
  enableDrag = true,
  realTime = false,
  updateInterval = 1000,
  onNodeClick,
  onEdgeClick,
  onSelectionChange,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<LayoutAlgorithm>(layout);
  const [showLabels, setShowLabels] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [filterByType, setFilterByType] = useState<string[]>([]);
  const [filterByStatus, setFilterByStatus] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(realTime);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  // Node type colors
  const nodeTypeColors = {
    server: '#2196F3',
    router: '#FF9800',
    switch: '#4CAF50',
    firewall: '#F44336',
    endpoint: '#9C27B0',
    cloud: '#00BCD4',
    database: '#795548',
  };

  // Status colors
  const statusColors = {
    online: '#4CAF50',
    offline: '#757575',
    warning: '#FF9800',
    critical: '#F44336',
    active: '#4CAF50',
    inactive: '#757575',
    congested: '#FF9800',
    error: '#F44336',
  };

  // Filter nodes and edges
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      const typeMatch = filterByType.length === 0 || filterByType.includes(node.type);
      const statusMatch = filterByStatus.length === 0 || filterByStatus.includes(node.status);
      return typeMatch && statusMatch;
    });
  }, [nodes, filterByType, filterByStatus]);

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map(node => node.id));
    return edges.filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  }, [edges, filteredNodes]);

  // Calculate node positions based on layout
  const calculateLayout = useCallback((nodes: NetworkNode[], edges: NetworkEdge[]): NetworkNode[] => {
    const layoutNodes = [...nodes];

    switch (currentLayout) {
      case 'force':
        return calculateForceLayout(layoutNodes, edges);
      case 'hierarchical':
        return calculateHierarchicalLayout(layoutNodes, edges);
      case 'circular':
        return calculateCircularLayout(layoutNodes);
      case 'grid':
        return calculateGridLayout(layoutNodes);
      case 'radial':
        return calculateRadialLayout(layoutNodes, edges);
      default:
        return layoutNodes;
    }
  }, [currentLayout]);

  // Force-directed layout
  const calculateForceLayout = (nodes: NetworkNode[], edges: NetworkEdge[]): NetworkNode[] => {
    const centerX = width / 2;
    const centerY = height / 2;
    
    return nodes.map((node, index) => ({
      ...node,
      x: node.x || centerX + (Math.random() - 0.5) * 200,
      y: node.y || centerY + (Math.random() - 0.5) * 200,
    }));
  };

  // Hierarchical layout
  const calculateHierarchicalLayout = (nodes: NetworkNode[], edges: NetworkEdge[]): NetworkNode[] => {
    const levels = new Map<string, number>();
    const visited = new Set<string>();
    
    // Simple BFS to determine levels
    const queue = [nodes[0]?.id].filter(Boolean);
    levels.set(queue[0], 0);
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      
      const currentLevel = levels.get(currentId) || 0;
      const connectedEdges = edges.filter(e => e.source === currentId || e.target === currentId);
      
      connectedEdges.forEach(edge => {
        const nextId = edge.source === currentId ? edge.target : edge.source;
        if (!levels.has(nextId)) {
          levels.set(nextId, currentLevel + 1);
          queue.push(nextId);
        }
      });
    }

    const maxLevel = Math.max(...Array.from(levels.values()));
    const levelCounts = new Map<number, number>();
    
    return nodes.map(node => {
      const level = levels.get(node.id) || 0;
      const count = levelCounts.get(level) || 0;
      levelCounts.set(level, count + 1);
      
      return {
        ...node,
        x: (width / (maxLevel + 1)) * (level + 1),
        y: (height / 6) * (count + 1),
      };
    });
  };

  // Circular layout
  const calculateCircularLayout = (nodes: NetworkNode[]): NetworkNode[] => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    
    return nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
  };

  // Grid layout
  const calculateGridLayout = (nodes: NetworkNode[]): NetworkNode[] => {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const cellWidth = width / cols;
    const cellHeight = height / Math.ceil(nodes.length / cols);
    
    return nodes.map((node, index) => ({
      ...node,
      x: (index % cols) * cellWidth + cellWidth / 2,
      y: Math.floor(index / cols) * cellHeight + cellHeight / 2,
    }));
  };

  // Radial layout
  const calculateRadialLayout = (nodes: NetworkNode[], edges: NetworkEdge[]): NetworkNode[] => {
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Find the most connected node as center
    const connections = new Map<string, number>();
    edges.forEach(edge => {
      connections.set(edge.source, (connections.get(edge.source) || 0) + 1);
      connections.set(edge.target, (connections.get(edge.target) || 0) + 1);
    });
    
    const centerNode = nodes.reduce((max, node) => 
      (connections.get(node.id) || 0) > (connections.get(max.id) || 0) ? node : max
    );
    
    return nodes.map(node => {
      if (node.id === centerNode.id) {
        return { ...node, x: centerX, y: centerY };
      }
      
      const angle = Math.random() * 2 * Math.PI;
      const distance = 100 + Math.random() * 150;
      
      return {
        ...node,
        x: centerX + distance * Math.cos(angle),
        y: centerY + distance * Math.sin(angle),
      };
    });
  };

  // Apply layout to nodes
  const positionedNodes = useMemo(() => {
    return calculateLayout(filteredNodes, filteredEdges);
  }, [filteredNodes, filteredEdges, calculateLayout]);

  // Handle zoom
  const handleZoom = (factor: number) => {
    setZoom(prev => Math.max(0.1, Math.min(5, prev * factor)));
  };

  // Reset view
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Handle node selection
  const handleNodeClick = (node: NetworkNode) => {
    setSelectedNodes(prev => 
      prev.includes(node.id) 
        ? prev.filter(id => id !== node.id)
        : [...prev, node.id]
    );
    onNodeClick?.(node);
  };

  // Handle edge selection
  const handleEdgeClick = (edge: NetworkEdge) => {
    setSelectedEdges(prev => 
      prev.includes(edge.id) 
        ? prev.filter(id => id !== edge.id)
        : [...prev, edge.id]
    );
    onEdgeClick?.(edge);
  };

  // Animation loop
  useEffect(() => {
    if (isAnimating && realTime) {
      const animate = () => {
        // Update node positions slightly for animation effect
        // This would be replaced with real data updates
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, realTime]);

  // Render node
  const renderNode = (node: NetworkNode) => {
    const isSelected = selectedNodes.includes(node.id);
    const nodeColor = node.color || nodeTypeColors[node.type] || '#666';
    const statusColor = statusColors[node.status];
    const nodeSize = node.size || 20;

    return (
      <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
        {/* Node circle */}
        <circle
          r={nodeSize}
          fill={nodeColor}
          stroke={isSelected ? '#FFD700' : statusColor}
          strokeWidth={isSelected ? 3 : 2}
          style={{ cursor: 'pointer' }}
          onClick={() => handleNodeClick(node)}
        />
        
        {/* Status indicator */}
        <circle
          r={6}
          cx={nodeSize - 6}
          cy={-nodeSize + 6}
          fill={statusColor}
          stroke="white"
          strokeWidth={1}
        />
        
        {/* Node label */}
        {showLabels && (
          <text
            y={nodeSize + 15}
            textAnchor="middle"
            fontSize="12"
            fill="#333"
          >
            {node.label}
          </text>
        )}
        
        {/* Metrics */}
        {showMetrics && node.metadata && (
          <text
            y={nodeSize + 30}
            textAnchor="middle"
            fontSize="10"
            fill="#666"
          >
            {Object.entries(node.metadata).slice(0, 2).map(([key, value]) => 
              `${key}: ${value}`
            ).join(' | ')}
          </text>
        )}
      </g>
    );
  };

  // Render edge
  const renderEdge = (edge: NetworkEdge) => {
    const sourceNode = positionedNodes.find(n => n.id === edge.source);
    const targetNode = positionedNodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return null;

    const isSelected = selectedEdges.includes(edge.id);
    const edgeColor = edge.color || statusColors[edge.status] || '#999';
    const edgeWidth = edge.width || (edge.bandwidth ? Math.max(1, edge.bandwidth / 100) : 2);

    return (
      <g key={edge.id}>
        {/* Edge line */}
        <line
          x1={sourceNode.x}
          y1={sourceNode.y}
          x2={targetNode.x}
          y2={targetNode.y}
          stroke={edgeColor}
          strokeWidth={isSelected ? edgeWidth + 2 : edgeWidth}
          strokeDasharray={edge.animated ? '5,5' : 'none'}
          style={{ cursor: 'pointer' }}
          onClick={() => handleEdgeClick(edge)}
        >
          {edge.animated && (
            <animate
              attributeName="stroke-dashoffset"
              values="0;10"
              dur={`${2 / animationSpeed}s`}
              repeatCount="indefinite"
            />
          )}
        </line>
        
        {/* Edge metrics */}
        {showMetrics && (edge.bandwidth || edge.latency) && (
          <text
            x={(sourceNode.x! + targetNode.x!) / 2}
            y={(sourceNode.y! + targetNode.y!) / 2 - 5}
            textAnchor="middle"
            fontSize="10"
            fill="#666"
          >
            {edge.bandwidth && `${edge.bandwidth}Mbps`}
            {edge.latency && ` ${edge.latency}ms`}
          </text>
        )}
      </g>
    );
  };

  return (
    <Box ref={containerRef} sx={{ width: '100%', height: isFullscreen ? '100vh' : 'auto' }}>
      <Paper sx={{ p: 2 }}>
        {/* Toolbar */}
        <Toolbar sx={{ px: 0, minHeight: '48px !important' }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Network Topology
          </Typography>

          {/* Layout Selector */}
          <FormControl size="small" sx={{ mr: 2, minWidth: 120 }}>
            <InputLabel>Layout</InputLabel>
            <Select
              value={currentLayout}
              label="Layout"
              onChange={(e) => setCurrentLayout(e.target.value as LayoutAlgorithm)}
            >
              <MenuItem value="force">Force</MenuItem>
              <MenuItem value="hierarchical">Hierarchical</MenuItem>
              <MenuItem value="circular">Circular</MenuItem>
              <MenuItem value="grid">Grid</MenuItem>
              <MenuItem value="radial">Radial</MenuItem>
            </Select>
          </FormControl>

          {/* Zoom Controls */}
          {enableZoom && (
            <ButtonGroup size="small" sx={{ mr: 2 }}>
              <IconButton onClick={() => handleZoom(1.2)} title="Zoom In">
                <ZoomIn />
              </IconButton>
              <IconButton onClick={() => handleZoom(0.8)} title="Zoom Out">
                <ZoomOut />
              </IconButton>
              <IconButton onClick={resetView} title="Reset View">
                <ZoomOutMap />
              </IconButton>
            </ButtonGroup>
          )}

          {/* Animation Controls */}
          <IconButton
            onClick={() => setIsAnimating(!isAnimating)}
            color={isAnimating ? 'primary' : 'default'}
          >
            {isAnimating ? <Pause /> : <PlayArrow />}
          </IconButton>

          {/* Settings */}
          <IconButton onClick={() => setSettingsOpen(true)}>
            <Settings />
          </IconButton>

          {/* Fullscreen */}
          <IconButton onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
        </Toolbar>

        {/* Filter Chips */}
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {Object.keys(nodeTypeColors).map(type => (
            <Chip
              key={type}
              label={type}
              size="small"
              color={filterByType.includes(type) ? 'primary' : 'default'}
              onClick={() => {
                setFilterByType(prev =>
                  prev.includes(type)
                    ? prev.filter(t => t !== type)
                    : [...prev, type]
                );
              }}
            />
          ))}
        </Box>

        {/* SVG Container */}
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          <svg
            ref={svgRef}
            width={width}
            height={isFullscreen ? window.innerHeight - 200 : height}
            viewBox={`${-pan.x} ${-pan.y} ${width / zoom} ${height / zoom}`}
            style={{ background: '#f5f5f5' }}
          >
            {/* Grid background */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Render edges first (behind nodes) */}
            {filteredEdges.map(renderEdge)}

            {/* Render nodes */}
            {positionedNodes.map(renderNode)}
          </svg>
        </Box>

        {/* Legend */}
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Card sx={{ minWidth: 200 }}>
            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
              <Typography variant="subtitle2" gutterBottom>
                Node Types
              </Typography>
              <List dense>
                {Object.entries(nodeTypeColors).map(([type, color]) => (
                  <ListItem key={type} sx={{ py: 0 }}>
                    <Box
                      width={12}
                      height={12}
                      bgcolor={color}
                      borderRadius="50%"
                      mr={1}
                    />
                    <ListItemText primary={type} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          <Card sx={{ minWidth: 200 }}>
            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
              <Typography variant="subtitle2" gutterBottom>
                Status
              </Typography>
              <List dense>
                {Object.entries(statusColors).slice(0, 4).map(([status, color]) => (
                  <ListItem key={status} sx={{ py: 0 }}>
                    <Box
                      width={12}
                      height={12}
                      bgcolor={color}
                      borderRadius="50%"
                      mr={1}
                    />
                    <ListItemText primary={status} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>

        {/* Settings Dialog */}
        <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Topology Settings</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'grid', gap: 3, mt: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                  />
                }
                label="Show Labels"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={showMetrics}
                    onChange={(e) => setShowMetrics(e.target.checked)}
                  />
                }
                label="Show Metrics"
              />

              <Box>
                <Typography gutterBottom>Animation Speed</Typography>
                <Slider
                  value={animationSpeed}
                  onChange={(_, value) => setAnimationSpeed(value as number)}
                  min={0.1}
                  max={3}
                  step={0.1}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSettingsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default AdvancedNetworkTopology;