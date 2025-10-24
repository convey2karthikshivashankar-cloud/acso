/**
 * Network Topology Visualization
 * 
 * Interactive network topology visualization with real-time threat monitoring,
 * node status updates, and security event visualization.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Chip,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  Computer,
  Storage,
  Router,
  Security,
  Warning,
  Error,
  CheckCircle,
  Visibility,
  VisibilityOff,
  Refresh,
  Fullscreen,
  ZoomIn,
  ZoomOut,
  FilterList,
  Timeline,
  NetworkCheck,
  Shield,
  BugReport
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  NetworkNode,
  NetworkConnection,
  ThreatEvent,
  ThreatScenario,
  NetworkNodeType,
  ThreatSeverity
} from '../../services/threatScenarioGenerator';

interface NetworkTopologyVisualizationProps {
  nodes: NetworkNode[];
  connections: NetworkConnection[];
  threats: ThreatScenario[];
  events: ThreatEvent[];
  isRunning?: boolean;
  height?: number;
  onNodeClick?: (node: NetworkNode) => void;
  onThreatClick?: (threat: ThreatScenario) => void;
}

interface VisualizationSettings {
  showLabels: boolean;
  showConnections: boolean;
  showThreats: boolean;
  showTraffic: boolean;
  animateThreats: boolean;
  filterSeverity: ThreatSeverity | 'all';
  layoutType: 'force' | 'circular' | 'hierarchical';
}

interface NodePosition {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

const NetworkTopologyVisualization: React.FC<NetworkTopologyVisualizationProps> = ({
  nodes,
  connections,
  threats,
  events,
  isRunning = false,
  height = 600,
  onNodeClick,
  onThreatClick
}) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [settings, setSettings] = useState<VisualizationSettings>({
    showLabels: true,
    showConnections: true,
    showThreats: true,
    showTraffic: true,
    animateThreats: true,
    filterSeverity: 'all',
    layoutType: 'force'
  });
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(new Map());

  // Initialize node positions
  useEffect(() => {
    const positions = new Map<string, NodePosition>();
    
    if (settings.layoutType === 'circular') {
      const centerX = 400;
      const centerY = 300;
      const radius = 200;
      
      nodes.forEach((node, index) => {
        const angle = (index / nodes.length) * 2 * Math.PI;
        positions.set(node.id, {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius
        });
      });
    } else if (settings.layoutType === 'hierarchical') {
      // Arrange by node type in layers
      const layers = {
        'router': 0,
        'firewall': 1,
        'switch': 2,
        'server': 3,
        'database': 3,
        'workstation': 4,
        'endpoint': 4,
        'iot-device': 5,
        'cloud-service': 2
      };
      
      const layerCounts = new Map<number, number>();
      const layerNodes = new Map<number, NetworkNode[]>();
      
      nodes.forEach(node => {
        const layer = layers[node.type] || 4;
        if (!layerNodes.has(layer)) {
          layerNodes.set(layer, []);
        }
        layerNodes.get(layer)!.push(node);
      });
      
      layerNodes.forEach((layerNodeList, layer) => {
        const y = 100 + layer * 100;
        const spacing = 800 / (layerNodeList.length + 1);
        
        layerNodeList.forEach((node, index) => {
          positions.set(node.id, {
            x: spacing * (index + 1),
            y: y
          });
        });
      });
    } else {
      // Force-directed layout (simplified)
      nodes.forEach((node, index) => {
        positions.set(node.id, {
          x: node.position?.x || Math.random() * 800,
          y: node.position?.y || Math.random() * 600,
          vx: 0,
          vy: 0
        });
      });
    }
    
    setNodePositions(positions);
  }, [nodes, settings.layoutType]);

  // Animation loop
  useEffect(() => {
    if (isRunning) {
      const animate = () => {
        if (settings.layoutType === 'force') {
          updateForceLayout();
        }
        renderVisualization();
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      renderVisualization();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, settings, nodePositions, threats, events, zoom, pan]);

  // Force-directed layout simulation
  const updateForceLayout = useCallback(() => {
    const newPositions = new Map(nodePositions);
    const alpha = 0.1;
    const linkDistance = 100;
    const repulsionStrength = 1000;

    // Apply forces
    newPositions.forEach((pos, nodeId) => {
      let fx = 0;
      let fy = 0;

      // Repulsion between nodes
      newPositions.forEach((otherPos, otherNodeId) => {
        if (nodeId !== otherNodeId) {
          const dx = pos.x - otherPos.x;
          const dy = pos.y - otherPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsionStrength / (distance * distance);
          fx += (dx / distance) * force;
          fy += (dy / distance) * force;
        }
      });

      // Attraction along connections
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        node.connections.forEach(connectedId => {
          const connectedPos = newPositions.get(connectedId);
          if (connectedPos) {
            const dx = connectedPos.x - pos.x;
            const dy = connectedPos.y - pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (distance - linkDistance) * 0.1;
            fx += (dx / distance) * force;
            fy += (dy / distance) * force;
          }
        });
      }

      // Center attraction
      const centerX = 400;
      const centerY = 300;
      const centerDx = centerX - pos.x;
      const centerDy = centerY - pos.y;
      fx += centerDx * 0.01;
      fy += centerDy * 0.01;

      // Update velocity and position
      pos.vx = (pos.vx || 0) * 0.9 + fx * alpha;
      pos.vy = (pos.vy || 0) * 0.9 + fy * alpha;
      pos.x += pos.vx;
      pos.y += pos.vy;

      // Boundary constraints
      pos.x = Math.max(50, Math.min(750, pos.x));
      pos.y = Math.max(50, Math.min(550, pos.y));
    });

    setNodePositions(newPositions);
  }, [nodePositions, nodes]);

  // Render visualization
  const renderVisualization = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Render connections
    if (settings.showConnections) {
      renderConnections(ctx);
    }

    // Render threat paths
    if (settings.showThreats) {
      renderThreatPaths(ctx);
    }

    // Render network traffic
    if (settings.showTraffic) {
      renderNetworkTraffic(ctx);
    }

    // Render nodes
    renderNodes(ctx);

    // Render threat indicators
    if (settings.showThreats) {
      renderThreatIndicators(ctx);
    }

    ctx.restore();
  }, [nodePositions, connections, threats, events, settings, zoom, pan]);

  const renderConnections = (ctx: CanvasRenderingContext2D) => {
    connections.forEach(connection => {
      const sourcePos = nodePositions.get(connection.sourceId);
      const targetPos = nodePositions.get(connection.targetId);
      
      if (!sourcePos || !targetPos) return;

      ctx.beginPath();
      ctx.moveTo(sourcePos.x, sourcePos.y);
      ctx.lineTo(targetPos.x, targetPos.y);
      
      // Color based on connection status
      const color = connection.status === 'compromised' ? theme.palette.error.main :
                   connection.status === 'inactive' ? theme.palette.grey[400] :
                   theme.palette.primary.main;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = connection.status === 'compromised' ? 3 : 1;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  };

  const renderNodes = (ctx: CanvasRenderingContext2D) => {
    nodes.forEach(node => {
      const pos = nodePositions.get(node.id);
      if (!pos) return;

      const radius = getNodeRadius(node);
      const color = getNodeColor(node);
      
      // Node background
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      
      // Node border
      ctx.strokeStyle = getNodeBorderColor(node);
      ctx.lineWidth = node.status === 'compromised' ? 4 : 2;
      ctx.stroke();
      
      // Status indicator
      if (node.status !== 'healthy') {
        ctx.beginPath();
        ctx.arc(pos.x + radius * 0.7, pos.y - radius * 0.7, radius * 0.3, 0, 2 * Math.PI);
        ctx.fillStyle = getStatusColor(node.status);
        ctx.fill();
      }
      
      // Node icon
      renderNodeIcon(ctx, node, pos, radius);
      
      // Label
      if (settings.showLabels) {
        ctx.fillStyle = theme.palette.text.primary;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(node.name, pos.x, pos.y + radius + 15);
      }
    });
  };

  const renderNodeIcon = (ctx: CanvasRenderingContext2D, node: NetworkNode, pos: NodePosition, radius: number) => {
    const iconSize = radius * 0.6;
    ctx.fillStyle = theme.palette.common.white;
    ctx.font = `${iconSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const icon = getNodeIcon(node.type);
    ctx.fillText(icon, pos.x, pos.y);
  };

  const renderThreatPaths = (ctx: CanvasRenderingContext2D) => {
    const activeThreats = threats.filter(threat => 
      settings.filterSeverity === 'all' || threat.severity === settings.filterSeverity
    );

    activeThreats.forEach((threat, threatIndex) => {
      threat.targetNodes.forEach((nodeId, index) => {
        if (index === 0) return; // Skip first node
        
        const prevNodeId = threat.targetNodes[index - 1];
        const currentPos = nodePositions.get(nodeId);
        const prevPos = nodePositions.get(prevNodeId);
        
        if (!currentPos || !prevPos) return;

        // Animated threat path
        const time = Date.now() / 1000;
        const progress = settings.animateThreats ? 
          (Math.sin(time + threatIndex) + 1) / 2 : 1;
        
        const x = prevPos.x + (currentPos.x - prevPos.x) * progress;
        const y = prevPos.y + (currentPos.y - prevPos.y) * progress;
        
        // Threat path line
        ctx.beginPath();
        ctx.moveTo(prevPos.x, prevPos.y);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.strokeStyle = getThreatColor(threat.severity);
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.globalAlpha = 0.7;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        
        // Animated threat indicator
        if (settings.animateThreats) {
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = getThreatColor(threat.severity);
          ctx.fill();
        }
      });
    });
  };

  const renderNetworkTraffic = (ctx: CanvasRenderingContext2D) => {
    const time = Date.now() / 1000;
    
    connections.forEach((connection, index) => {
      const sourcePos = nodePositions.get(connection.sourceId);
      const targetPos = nodePositions.get(connection.targetId);
      
      if (!sourcePos || !targetPos || connection.traffic.length === 0) return;

      // Animate traffic flow
      const progress = (Math.sin(time * 2 + index) + 1) / 2;
      const x = sourcePos.x + (targetPos.x - sourcePos.x) * progress;
      const y = sourcePos.y + (targetPos.y - sourcePos.y) * progress;
      
      // Traffic particle
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = connection.status === 'compromised' ? 
        theme.palette.error.main : theme.palette.info.main;
      ctx.globalAlpha = 0.8;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  };

  const renderThreatIndicators = (ctx: CanvasRenderingContext2D) => {
    const recentEvents = events.filter(event => 
      Date.now() - event.timestamp.getTime() < 30000 // Last 30 seconds
    );

    recentEvents.forEach(event => {
      if (!event.nodeId) return;
      
      const pos = nodePositions.get(event.nodeId);
      if (!pos) return;

      const age = Date.now() - event.timestamp.getTime();
      const opacity = Math.max(0.2, 1 - age / 30000);
      
      // Threat indicator ring
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 40 + Math.sin(Date.now() / 200) * 5, 0, 2 * Math.PI);
      ctx.strokeStyle = getThreatColor(event.severity);
      ctx.lineWidth = 2;
      ctx.globalAlpha = opacity;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  };

  // Utility functions
  const getNodeRadius = (node: NetworkNode): number => {
    const baseRadius = {
      'router': 25,
      'firewall': 25,
      'switch': 20,
      'server': 22,
      'database': 22,
      'workstation': 18,
      'endpoint': 15,
      'iot-device': 12,
      'cloud-service': 20
    }[node.type] || 18;

    return baseRadius * (node.criticality === 'critical' ? 1.3 : 
                        node.criticality === 'high' ? 1.1 : 1);
  };

  const getNodeColor = (node: NetworkNode): string => {
    if (node.status === 'compromised') return theme.palette.error.main;
    if (node.status === 'suspicious') return theme.palette.warning.main;
    if (node.status === 'offline') return theme.palette.grey[500];
    
    const typeColors = {
      'router': theme.palette.primary.main,
      'firewall': theme.palette.error.main,
      'switch': theme.palette.info.main,
      'server': theme.palette.success.main,
      'database': theme.palette.warning.main,
      'workstation': theme.palette.secondary.main,
      'endpoint': theme.palette.grey[600],
      'iot-device': theme.palette.purple[500],
      'cloud-service': theme.palette.blue[500]
    };
    
    return typeColors[node.type] || theme.palette.grey[500];
  };

  const getNodeBorderColor = (node: NetworkNode): string => {
    if (node.status === 'compromised') return theme.palette.error.dark;
    if (node.status === 'suspicious') return theme.palette.warning.dark;
    return theme.palette.grey[700];
  };

  const getStatusColor = (status: NetworkNode['status']): string => {
    switch (status) {
      case 'compromised': return theme.palette.error.main;
      case 'suspicious': return theme.palette.warning.main;
      case 'offline': return theme.palette.grey[500];
      default: return theme.palette.success.main;
    }
  };

  const getThreatColor = (severity: ThreatSeverity): string => {
    switch (severity) {
      case 'critical': return theme.palette.error.main;
      case 'high': return theme.palette.warning.main;
      case 'medium': return theme.palette.info.main;
      case 'low': return theme.palette.success.main;
      default: return theme.palette.grey[500];
    }
  };

  const getNodeIcon = (type: NetworkNodeType): string => {
    const icons = {
      'router': '🌐',
      'firewall': '🛡️',
      'switch': '🔀',
      'server': '🖥️',
      'database': '🗄️',
      'workstation': '💻',
      'endpoint': '📱',
      'iot-device': '📡',
      'cloud-service': '☁️'
    };
    return icons[type] || '🖥️';
  };

  // Event handlers
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - pan.x) / zoom;
    const y = (event.clientY - rect.top - pan.y) / zoom;
    
    // Find clicked node
    const clickedNode = nodes.find(node => {
      const pos = nodePositions.get(node.id);
      if (!pos) return false;
      
      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      return distance <= getNodeRadius(node);
    });
    
    if (clickedNode) {
      setSelectedNode(clickedNode);
      setDetailsDrawerOpen(true);
      onNodeClick?.(clickedNode);
    }
  };

  // Statistics
  const networkStats = useMemo(() => {
    const compromisedNodes = nodes.filter(n => n.status === 'compromised').length;
    const suspiciousNodes = nodes.filter(n => n.status === 'suspicious').length;
    const offlineNodes = nodes.filter(n => n.status === 'offline').length;
    const activeThreats = threats.filter(t => 
      settings.filterSeverity === 'all' || t.severity === settings.filterSeverity
    ).length;
    
    return {
      total: nodes.length,
      compromised: compromisedNodes,
      suspicious: suspiciousNodes,
      offline: offlineNodes,
      healthy: nodes.length - compromisedNodes - suspiciousNodes - offlineNodes,
      threats: activeThreats
    };
  }, [nodes, threats, settings.filterSeverity]);

  return (
    <Box sx={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NetworkCheck />
            Network Topology
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Network statistics */}
            <Chip
              icon={<Computer />}
              label={`${networkStats.total} Nodes`}
              size="small"
              variant="outlined"
            />
            
            {networkStats.compromised > 0 && (
              <Chip
                icon={<Error />}
                label={`${networkStats.compromised} Compromised`}
                size="small"
                color="error"
              />
            )}
            
            {networkStats.suspicious > 0 && (
              <Chip
                icon={<Warning />}
                label={`${networkStats.suspicious} Suspicious`}
                size="small"
                color="warning"
              />
            )}
            
            <Chip
              icon={<Shield />}
              label={`${networkStats.threats} Threats`}
              size="small"
              color={networkStats.threats > 0 ? 'error' : 'success'}
            />

            {/* Controls */}
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Layout</InputLabel>
              <Select
                value={settings.layoutType}
                label="Layout"
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  layoutType: e.target.value as VisualizationSettings['layoutType']
                }))}
              >
                <MenuItem value="force">Force</MenuItem>
                <MenuItem value="circular">Circular</MenuItem>
                <MenuItem value="hierarchical">Hierarchical</MenuItem>
              </Select>
            </FormControl>

            <Tooltip title="Zoom In">
              <IconButton onClick={() => setZoom(prev => Math.min(3, prev * 1.2))} size="small">
                <ZoomIn />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Zoom Out">
              <IconButton onClick={() => setZoom(prev => Math.max(0.3, prev / 1.2))} size="small">
                <ZoomOut />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {/* Settings toggles */}
        <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.showLabels}
                onChange={(e) => setSettings(prev => ({ ...prev, showLabels: e.target.checked }))}
                size="small"
              />
            }
            label="Labels"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.showConnections}
                onChange={(e) => setSettings(prev => ({ ...prev, showConnections: e.target.checked }))}
                size="small"
              />
            }
            label="Connections"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.showThreats}
                onChange={(e) => setSettings(prev => ({ ...prev, showThreats: e.target.checked }))}
                size="small"
              />
            }
            label="Threats"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.showTraffic}
                onChange={(e) => setSettings(prev => ({ ...prev, showTraffic: e.target.checked }))}
                size="small"
              />
            }
            label="Traffic"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.animateThreats}
                onChange={(e) => setSettings(prev => ({ ...prev, animateThreats: e.target.checked }))}
                size="small"
              />
            }
            label="Animate"
          />
        </Box>
      </Paper>

      {/* Canvas */}
      <Paper elevation={2} sx={{ flex: 1, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={height - 120}
          onClick={handleCanvasClick}
          style={{
            width: '100%',
            height: '100%',
            cursor: 'pointer',
            background: theme.palette.background.default
          }}
        />
        
        {/* Status overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Chip
            label={isRunning ? 'LIVE' : 'STATIC'}
            color={isRunning ? 'success' : 'default'}
            size="small"
          />
          <Chip
            label={`Zoom: ${Math.round(zoom * 100)}%`}
            size="small"
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* Node details drawer */}
      <Drawer
        anchor="right"
        open={detailsDrawerOpen}
        onClose={() => setDetailsDrawerOpen(false)}
      >
        <Box sx={{ width: 350, p: 2 }}>
          {selectedNode && (
            <>
              <Typography variant="h6" gutterBottom>
                {selectedNode.name}
              </Typography>
              
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Network Information
                  </Typography>
                  <Typography variant="body2">
                    IP: {selectedNode.ipAddress}
                  </Typography>
                  <Typography variant="body2">
                    Subnet: {selectedNode.subnet}
                  </Typography>
                  <Typography variant="body2">
                    Type: {selectedNode.type}
                  </Typography>
                  <Typography variant="body2">
                    Status: <Chip 
                      label={selectedNode.status} 
                      size="small" 
                      color={selectedNode.status === 'healthy' ? 'success' : 
                             selectedNode.status === 'compromised' ? 'error' : 'warning'}
                    />
                  </Typography>
                </CardContent>
              </Card>

              {selectedNode.vulnerabilities.length > 0 && (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Vulnerabilities ({selectedNode.vulnerabilities.length})
                    </Typography>
                    <List dense>
                      {selectedNode.vulnerabilities.slice(0, 3).map((vuln, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <BugReport color={vuln.severity === 'critical' ? 'error' : 'warning'} />
                          </ListItemIcon>
                          <ListItemText
                            primary={vuln.name}
                            secondary={`CVSS: ${vuln.cvssScore}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}

              {selectedNode.services.length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Services ({selectedNode.services.length})
                    </Typography>
                    <List dense>
                      {selectedNode.services.slice(0, 5).map((service, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={`${service.name} (${service.port})`}
                            secondary={`${service.protocol} - ${service.status}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default NetworkTopologyVisualization;