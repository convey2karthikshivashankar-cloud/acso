import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add,
  PlayArrow,
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  FitScreen,
  Delete,
  Edit,
  Settings,
  AccountTree,
  Schedule,
  CheckCircle,
  Error,
  Warning,
  Code,
  Api,
  Notifications,
  Storage,
  Security,
  Transform,
} from '@mui/icons-material';

export interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'task' | 'decision' | 'parallel' | 'merge' | 'delay' | 'api' | 'notification';
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    config?: Record<string, any>;
    validation?: {
      isValid: boolean;
      errors: string[];
    };
  };
  inputs: string[];
  outputs: string[];
}

export interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
  condition?: string;
  label?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  variables: Record<string, any>;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    tags: string[];
  };
}

interface WorkflowDesignerProps {
  workflow?: Workflow;
  onSave?: (workflow: Workflow) => void;
  onExecute?: (workflow: Workflow) => void;
  readOnly?: boolean;
}

interface NodePaletteProps {
  onAddNode: (type: WorkflowNode['type']) => void;
}

interface WorkflowCanvasProps {
  workflow: Workflow;
  selectedNode: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onUpdateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddConnection: (connection: Omit<WorkflowConnection, 'id'>) => void;
  onDeleteConnection: (connectionId: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

interface NodePropertiesProps {
  node: WorkflowNode | null;
  onUpdateNode: (updates: Partial<WorkflowNode>) => void;
  onClose: () => void;
}

const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode }) => {
  const nodeTypes = [
    { type: 'start' as const, label: 'Start', icon: <PlayArrow />, description: 'Workflow entry point' },
    { type: 'end' as const, label: 'End', icon: <CheckCircle />, description: 'Workflow completion' },
    { type: 'task' as const, label: 'Task', icon: <AccountTree />, description: 'Execute a task' },
    { type: 'decision' as const, label: 'Decision', icon: <Warning />, description: 'Conditional branching' },
    { type: 'parallel' as const, label: 'Parallel', icon: <Transform />, description: 'Parallel execution' },
    { type: 'merge' as const, label: 'Merge', icon: <Transform />, description: 'Merge parallel flows' },
    { type: 'delay' as const, label: 'Delay', icon: <Schedule />, description: 'Wait for specified time' },
    { type: 'api' as const, label: 'API Call', icon: <Api />, description: 'External API request' },
    { type: 'notification' as const, label: 'Notification', icon: <Notifications />, description: 'Send notification' },
  ];

  return (
    <Box sx={{ width: 250, p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Node Palette
      </Typography>
      <List>
        {nodeTypes.map((nodeType) => (
          <ListItem
            key={nodeType.type}
            button
            onClick={() => onAddNode(nodeType.type)}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ListItemIcon>{nodeType.icon}</ListItemIcon>
            <ListItemText
              primary={nodeType.label}
              secondary={nodeType.description}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  workflow,
  selectedNode,
  onSelectNode,
  onUpdateNode,
  onDeleteNode,
  onAddConnection,
  onDeleteConnection,
  zoom,
  onZoomChange,
}) => {
  const theme = useTheme();
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [draggedNode, setDraggedNode] = React.useState<string | null>(null);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const [connectionStart, setConnectionStart] = React.useState<{
    nodeId: string;
    handle: string;
  } | null>(null);

  const getNodeColor = (type: WorkflowNode['type']) => {
    switch (type) {
      case 'start': return theme.palette.success.main;
      case 'end': return theme.palette.error.main;
      case 'task': return theme.palette.primary.main;
      case 'decision': return theme.palette.warning.main;
      case 'parallel': return theme.palette.info.main;
      case 'merge': return theme.palette.info.main;
      case 'delay': return theme.palette.secondary.main;
      case 'api': return theme.palette.purple?.main || theme.palette.primary.main;
      case 'notification': return theme.palette.orange?.main || theme.palette.warning.main;
      default: return theme.palette.grey[500];
    }
  };

  const getNodeIcon = (type: WorkflowNode['type']) => {
    switch (type) {
      case 'start': return <PlayArrow />;
      case 'end': return <CheckCircle />;
      case 'task': return <AccountTree />;
      case 'decision': return <Warning />;
      case 'parallel': return <Transform />;
      case 'merge': return <Transform />;
      case 'delay': return <Schedule />;
      case 'api': return <Api />;
      case 'notification': return <Notifications />;
      default: return <Code />;
    }
  };

  const handleNodeMouseDown = (nodeId: string, event: React.MouseEvent) => {
    event.preventDefault();
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: event.clientX - node.position.x,
      y: event.clientY - node.position.y,
    });
    setDraggedNode(nodeId);
    onSelectNode(nodeId);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (draggedNode) {
      const newPosition = {
        x: event.clientX - dragOffset.x,
        y: event.clientY - dragOffset.y,
      };
      onUpdateNode(draggedNode, { position: newPosition });
    }
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleConnectionStart = (nodeId: string, handle: string) => {
    setConnectionStart({ nodeId, handle });
  };

  const handleConnectionEnd = (nodeId: string, handle: string) => {
    if (connectionStart && connectionStart.nodeId !== nodeId) {
      onAddConnection({
        sourceNodeId: connectionStart.nodeId,
        targetNodeId: nodeId,
        sourceHandle: connectionStart.handle,
        targetHandle: handle,
      });
    }
    setConnectionStart(null);
  };

  const renderNode = (node: WorkflowNode) => {
    const isSelected = selectedNode === node.id;
    const nodeColor = getNodeColor(node.type);
    const hasErrors = node.data.validation && !node.data.validation.isValid;

    return (
      <Box
        key={node.id}
        sx={{
          position: 'absolute',
          left: node.position.x * zoom,
          top: node.position.y * zoom,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          cursor: draggedNode === node.id ? 'grabbing' : 'grab',
        }}
        onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
      >
        <Card
          sx={{
            width: 150,
            minHeight: 80,
            border: 2,
            borderColor: isSelected ? 'primary.main' : hasErrors ? 'error.main' : 'divider',
            backgroundColor: alpha(nodeColor, 0.1),
            '&:hover': {
              borderColor: 'primary.main',
            },
          }}
        >
          <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Box sx={{ color: nodeColor, mr: 1 }}>
                {getNodeIcon(node.type)}
              </Box>
              <Typography variant="caption" fontWeight="bold">
                {node.type.toUpperCase()}
              </Typography>
              {hasErrors && (
                <Error color="error" fontSize="small" sx={{ ml: 'auto' }} />
              )}
            </Box>
            <Typography variant="body2" noWrap>
              {node.data.label}
            </Typography>
            
            {/* Connection handles */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: -8,
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                cursor: 'crosshair',
                transform: 'translateY(-50%)',
              }}
              onClick={() => handleConnectionEnd(node.id, 'input')}
            />
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                right: -8,
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                cursor: 'crosshair',
                transform: 'translateY(-50%)',
              }}
              onClick={() => handleConnectionStart(node.id, 'output')}
            />
          </CardContent>
        </Card>
      </Box>
    );
  };

  const renderConnection = (connection: WorkflowConnection) => {
    const sourceNode = workflow.nodes.find(n => n.id === connection.sourceNodeId);
    const targetNode = workflow.nodes.find(n => n.id === connection.targetNodeId);
    
    if (!sourceNode || !targetNode) return null;

    const startX = (sourceNode.position.x + 150) * zoom;
    const startY = (sourceNode.position.y + 40) * zoom;
    const endX = targetNode.position.x * zoom;
    const endY = (targetNode.position.y + 40) * zoom;

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    return (
      <g key={connection.id}>
        <path
          d={`M ${startX} ${startY} Q ${midX} ${startY} ${midX} ${midY} Q ${midX} ${endY} ${endX} ${endY}`}
          stroke={theme.palette.primary.main}
          strokeWidth={2}
          fill="none"
          markerEnd="url(#arrowhead)"
        />
        {connection.label && (
          <text
            x={midX}
            y={midY - 10}
            textAnchor="middle"
            fontSize="12"
            fill={theme.palette.text.primary}
          >
            {connection.label}
          </text>
        )}
      </g>
    );
  };

  return (
    <Box
      ref={canvasRef}
      sx={{
        flex: 1,
        position: 'relative',
        overflow: 'auto',
        backgroundColor: 'grey.50',
        backgroundImage: `
          radial-gradient(circle, ${theme.palette.grey[300]} 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* SVG for connections */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill={theme.palette.primary.main}
            />
          </marker>
        </defs>
        {workflow.connections.map(renderConnection)}
      </svg>

      {/* Nodes */}
      {workflow.nodes.map(renderNode)}

      {/* Zoom controls */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <IconButton
          size="small"
          onClick={() => onZoomChange(Math.min(zoom + 0.1, 2))}
          sx={{ backgroundColor: 'background.paper' }}
        >
          <ZoomIn />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onZoomChange(Math.max(zoom - 0.1, 0.5))}
          sx={{ backgroundColor: 'background.paper' }}
        >
          <ZoomOut />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onZoomChange(1)}
          sx={{ backgroundColor: 'background.paper' }}
        >
          <FitScreen />
        </IconButton>
      </Box>
    </Box>
  );
};

const NodeProperties: React.FC<NodePropertiesProps> = ({
  node,
  onUpdateNode,
  onClose,
}) => {
  const [localNode, setLocalNode] = React.useState<WorkflowNode | null>(node);

  React.useEffect(() => {
    setLocalNode(node);
  }, [node]);

  if (!localNode) return null;

  const handleSave = () => {
    onUpdateNode(localNode);
    onClose();
  };

  const updateNodeData = (updates: Partial<WorkflowNode['data']>) => {
    setLocalNode({
      ...localNode,
      data: { ...localNode.data, ...updates },
    });
  };

  const renderTypeSpecificConfig = () => {
    switch (localNode.type) {
      case 'task':
        return (
          <Box>
            <TextField
              fullWidth
              label="Task Command"
              value={localNode.data.config?.command || ''}
              onChange={(e) => updateNodeData({
                config: { ...localNode.data.config, command: e.target.value }
              })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Timeout (seconds)"
              type="number"
              value={localNode.data.config?.timeout || 30}
              onChange={(e) => updateNodeData({
                config: { ...localNode.data.config, timeout: parseInt(e.target.value) }
              })}
              sx={{ mb: 2 }}
            />
          </Box>
        );
      case 'decision':
        return (
          <TextField
            fullWidth
            label="Condition"
            value={localNode.data.config?.condition || ''}
            onChange={(e) => updateNodeData({
              config: { ...localNode.data.config, condition: e.target.value }
            })}
            sx={{ mb: 2 }}
            helperText="JavaScript expression that evaluates to true/false"
          />
        );
      case 'delay':
        return (
          <TextField
            fullWidth
            label="Delay (seconds)"
            type="number"
            value={localNode.data.config?.delay || 1}
            onChange={(e) => updateNodeData({
              config: { ...localNode.data.config, delay: parseInt(e.target.value) }
            })}
            sx={{ mb: 2 }}
          />
        );
      case 'api':
        return (
          <Box>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Method</InputLabel>
              <Select
                value={localNode.data.config?.method || 'GET'}
                onChange={(e) => updateNodeData({
                  config: { ...localNode.data.config, method: e.target.value }
                })}
              >
                <MenuItem value="GET">GET</MenuItem>
                <MenuItem value="POST">POST</MenuItem>
                <MenuItem value="PUT">PUT</MenuItem>
                <MenuItem value="DELETE">DELETE</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="URL"
              value={localNode.data.config?.url || ''}
              onChange={(e) => updateNodeData({
                config: { ...localNode.data.config, url: e.target.value }
              })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Request Body (JSON)"
              value={localNode.data.config?.body || ''}
              onChange={(e) => updateNodeData({
                config: { ...localNode.data.config, body: e.target.value }
              })}
              sx={{ mb: 2 }}
            />
          </Box>
        );
      case 'notification':
        return (
          <Box>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={localNode.data.config?.type || 'email'}
                onChange={(e) => updateNodeData({
                  config: { ...localNode.data.config, type: e.target.value }
                })}
              >
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="slack">Slack</MenuItem>
                <MenuItem value="webhook">Webhook</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Recipients"
              value={localNode.data.config?.recipients || ''}
              onChange={(e) => updateNodeData({
                config: { ...localNode.data.config, recipients: e.target.value }
              })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Message"
              multiline
              rows={3}
              value={localNode.data.config?.message || ''}
              onChange={(e) => updateNodeData({
                config: { ...localNode.data.config, message: e.target.value }
              })}
              sx={{ mb: 2 }}
            />
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={!!node} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Node Properties - {localNode.type.toUpperCase()}
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Label"
          value={localNode.data.label}
          onChange={(e) => updateNodeData({ label: e.target.value })}
          sx={{ mb: 2, mt: 1 }}
        />
        <TextField
          fullWidth
          label="Description"
          multiline
          rows={2}
          value={localNode.data.description || ''}
          onChange={(e) => updateNodeData({ description: e.target.value })}
          sx={{ mb: 2 }}
        />
        {renderTypeSpecificConfig()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
  workflow: initialWorkflow,
  onSave,
  onExecute,
  readOnly = false,
}) => {
  const theme = useTheme();
  const [workflow, setWorkflow] = React.useState<Workflow>(
    initialWorkflow || {
      id: 'new-workflow',
      name: 'New Workflow',
      description: '',
      version: '1.0.0',
      nodes: [],
      connections: [],
      variables: {},
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'current-user',
        tags: [],
      },
    }
  );
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);
  const [showNodeProperties, setShowNodeProperties] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);
  const [showPalette, setShowPalette] = React.useState(true);

  const addNode = (type: WorkflowNode['type']) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: {
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
        config: {},
      },
      inputs: type === 'start' ? [] : ['input'],
      outputs: type === 'end' ? [] : ['output'],
    };

    setWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      metadata: { ...prev.metadata, updatedAt: new Date() },
    }));
  };

  const updateNode = (nodeId: string, updates: Partial<WorkflowNode>) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node =>
        node.id === nodeId ? { ...node, ...updates } : node
      ),
      metadata: { ...prev.metadata, updatedAt: new Date() },
    }));
  };

  const deleteNode = (nodeId: string) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      connections: prev.connections.filter(
        conn => conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
      ),
      metadata: { ...prev.metadata, updatedAt: new Date() },
    }));
    setSelectedNode(null);
  };

  const addConnection = (connection: Omit<WorkflowConnection, 'id'>) => {
    const newConnection: WorkflowConnection = {
      ...connection,
      id: `conn-${Date.now()}`,
    };

    setWorkflow(prev => ({
      ...prev,
      connections: [...prev.connections, newConnection],
      metadata: { ...prev.metadata, updatedAt: new Date() },
    }));
  };

  const deleteConnection = (connectionId: string) => {
    setWorkflow(prev => ({
      ...prev,
      connections: prev.connections.filter(conn => conn.id !== connectionId),
      metadata: { ...prev.metadata, updatedAt: new Date() },
    }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(workflow);
    }
  };

  const handleExecute = () => {
    if (onExecute) {
      onExecute(workflow);
    }
  };

  const handleNodeDoubleClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    setShowNodeProperties(true);
  };

  const selectedNodeData = selectedNode ? workflow.nodes.find(n => n.id === selectedNode) : null;

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Paper sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, borderRadius: 0 }}>
        <Typography variant="h6" sx={{ mr: 2 }}>
          {workflow.name}
        </Typography>
        <Button
          startIcon={<Add />}
          onClick={() => setShowPalette(!showPalette)}
        >
          Nodes
        </Button>
        <Divider orientation="vertical" flexItem />
        <Button startIcon={<Save />} onClick={handleSave} disabled={readOnly}>
          Save
        </Button>
        <Button startIcon={<PlayArrow />} onClick={handleExecute}>
          Execute
        </Button>
        <Divider orientation="vertical" flexItem />
        <Button startIcon={<Undo />} disabled>
          Undo
        </Button>
        <Button startIcon={<Redo />} disabled>
          Redo
        </Button>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label={`${workflow.nodes.length} nodes`} size="small" />
          <Chip label={`${workflow.connections.length} connections`} size="small" />
          <Typography variant="body2">
            Zoom: {Math.round(zoom * 100)}%
          </Typography>
        </Box>
      </Paper>

      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex' }}>
        {/* Node palette */}
        <Drawer
          variant="persistent"
          anchor="left"
          open={showPalette}
          sx={{
            '& .MuiDrawer-paper': {
              position: 'relative',
              borderRight: 1,
              borderColor: 'divider',
            },
          }}
        >
          <NodePalette onAddNode={addNode} />
        </Drawer>

        {/* Canvas */}
        <WorkflowCanvas
          workflow={workflow}
          selectedNode={selectedNode}
          onSelectNode={setSelectedNode}
          onUpdateNode={updateNode}
          onDeleteNode={deleteNode}
          onAddConnection={addConnection}
          onDeleteConnection={deleteConnection}
          zoom={zoom}
          onZoomChange={setZoom}
        />
      </Box>

      {/* Node properties dialog */}
      <NodeProperties
        node={selectedNodeData}
        onUpdateNode={(updates) => {
          if (selectedNode) {
            updateNode(selectedNode, updates);
          }
        }}
        onClose={() => {
          setShowNodeProperties(false);
          setSelectedNode(null);
        }}
      />
    </Box>
  );
};